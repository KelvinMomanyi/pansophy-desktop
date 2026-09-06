use std::time::Duration;

use reqwest::Client;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use url::Url;

use crate::{CommandError, CommandResult};

const MAX_SEARCH_LENGTH: usize = 500;
const MAX_RESPONSE_BYTES: usize = 2 * 1024 * 1024;

fn clean_html_text(text: &str) -> String {
    Html::parse_fragment(text)
        .root_element()
        .text()
        .collect::<Vec<_>>()
        .join(" ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub title: String,
    pub description: String,
    pub link: String,
    pub link_text: String,
    pub domain: String,
}

fn result_url(href: &str) -> Option<Url> {
    let absolute = if href.starts_with("//") {
        format!("https:{href}")
    } else {
        href.to_owned()
    };
    let mut url = Url::parse(&absolute).ok()?;
    if matches!(
        url.host_str(),
        Some("duckduckgo.com" | "www.duckduckgo.com")
    ) {
        if let Some((_, target)) = url.query_pairs().find(|(name, _)| name == "uddg") {
            url = Url::parse(&target).ok()?;
        }
    }
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return None;
    }
    Some(url)
}

pub fn validate_search(search: &str) -> CommandResult<&str> {
    let query = search.trim();
    if query.is_empty() || query.chars().count() > MAX_SEARCH_LENGTH {
        return Err(CommandError::new(
            "INVALID_INPUT",
            "Search queries must contain between 1 and 500 characters.",
        ));
    }
    Ok(query)
}

pub struct DuckDuckGoLiteClient {
    client: Client,
    base_url: Url,
}

impl DuckDuckGoLiteClient {
    pub fn new() -> CommandResult<Self> {
        Self::with_endpoint("https://lite.duckduckgo.com/lite/")
    }

    /// Endpoint injection permits deterministic loopback HTTP tests.
    pub fn with_endpoint(endpoint: &str) -> CommandResult<Self> {
        Ok(Self {
            client: Client::builder()
                .user_agent("Pansophy/0.1")
                .timeout(Duration::from_secs(15))
                .redirect(reqwest::redirect::Policy::none())
                .no_proxy()
                .build()
                .map_err(|error| {
                    CommandError::internal("Could not initialize web search.", error)
                })?,
            base_url: crate::health::validate_base_url(endpoint)?,
        })
    }

    pub async fn search(&self, search_term: &str) -> CommandResult<Vec<SearchResult>> {
        let query = validate_search(search_term)?;
        let mut response = self
            .client
            .get(self.base_url.clone())
            .query(&[("q", query)])
            .send()
            .await
            .map_err(|error| CommandError::internal("Web search failed.", error))?;
        if !response.status().is_success() {
            return Err(CommandError::new(
                "SEARCH_UNAVAILABLE",
                "The search provider is unavailable.",
            ));
        }
        let mut bytes = Vec::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|error| CommandError::internal("Could not read search results.", error))?
        {
            if bytes.len().saturating_add(chunk.len()) > MAX_RESPONSE_BYTES {
                return Err(CommandError::new(
                    "INVALID_RESPONSE",
                    "The search response exceeded its size limit.",
                ));
            }
            bytes.extend_from_slice(&chunk);
        }
        parse_results(&String::from_utf8_lossy(&bytes))
    }
}

fn parse_results(body: &str) -> CommandResult<Vec<SearchResult>> {
    let document = Html::parse_document(body);
    let select = |value| {
        Selector::parse(value)
            .map_err(|error| CommandError::internal("Could not parse search results.", error))
    };
    let row_selector = select("tr")?;
    let link_selector = select("a.result-link")?;
    let snippet_selector = select("td.result-snippet")?;
    let text_selector = select("span.link-text")?;
    let rows: Vec<_> = document.select(&row_selector).collect();
    let mut results = Vec::new();

    for (index, row) in rows.iter().enumerate() {
        let Some(anchor) = row.select(&link_selector).next() else {
            continue;
        };
        let Some(url) = anchor.value().attr("href").and_then(result_url) else {
            continue;
        };
        let title = clean_html_text(&anchor.inner_html());
        if title.is_empty() {
            continue;
        }
        let mut description = String::new();
        let mut link_text = String::new();
        for next in rows.iter().skip(index + 1).take(6) {
            // A result without a snippet must not borrow the next result's description.
            if next.select(&link_selector).next().is_some() {
                break;
            }
            if let Some(snippet) = next.select(&snippet_selector).next() {
                description = clean_html_text(&snippet.inner_html());
            }
            if let Some(text) = next.select(&text_selector).next() {
                link_text = clean_html_text(&text.inner_html());
            }
        }
        results.push(SearchResult {
            title,
            description,
            link_text,
            domain: url.host_str().unwrap_or_default().to_owned(),
            link: url.to_string(),
        });
        if results.len() == 5 {
            break;
        }
    }
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cleans_nested_markup_entities_and_whitespace() {
        assert_eq!(
            clean_html_text(" <b>Pansophy</b>&nbsp;&amp; <em>friends</em>\n "),
            "Pansophy & friends"
        );
    }

    #[test]
    fn validates_queries_before_network_access() {
        assert_eq!(validate_search("  rust tauri  ").unwrap(), "rust tauri");
        assert!(validate_search(" ").is_err());
        assert!(validate_search(&"\u{e9}".repeat(500)).is_ok());
        assert!(validate_search(&"\u{e9}".repeat(501)).is_err());
    }

    #[test]
    fn unwraps_redirects_and_rejects_unsafe_links() {
        assert_eq!(
            result_url("//duckduckgo.com/l/?uddg=https%3A%2F%2Fdocs.example.com%2Fx")
                .unwrap()
                .as_str(),
            "https://docs.example.com/x"
        );
        for value in [
            "javascript:alert(1)",
            "file:///tmp/a",
            "/relative",
            "https://user:pass@example.com",
        ] {
            assert!(result_url(value).is_none(), "{value}");
        }
    }

    #[test]
    fn keeps_snippets_with_their_own_result_and_limits_results() {
        let rows = (0..8).map(|i| format!("<tr><td><a class='result-link' href='https://example.com/{i}'>Title {i}</a></td></tr>")).collect::<String>();
        let results = parse_results(&format!(
            "<table>{rows}<tr><td class='result-snippet'>Last only</td></tr></table>"
        ))
        .unwrap();
        assert_eq!(results.len(), 5);
        assert!(results.iter().all(|result| result.description.is_empty()));
    }
}
