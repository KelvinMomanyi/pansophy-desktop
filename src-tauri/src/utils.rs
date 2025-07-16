use scraper::Selector;
use serde::{Deserialize, Serialize};
use std::error::Error;
use tauri_plugin_http::reqwest;
use tauri_plugin_http::reqwest::Client;
use url::Url;

fn clean_html_text(text: &str) -> String {
    // Simple HTML tag removal and entity decoding
    let mut cleaned = text
        .replace("<b>", "")
        .replace("</b>", "")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .trim()
        .to_string();

    // Remove extra whitespace
    while cleaned.contains("  ") {
        cleaned = cleaned.replace("  ", " ");
    }

    cleaned
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    title: String,
    description: String,
    link: String,
    link_text: String,
    domain: String,
}

impl SearchResult {
    fn new(title: String, description: String, link: String, link_text: String) -> Self {
        let domain = extract_domain(&link).unwrap_or_default();

        Self {
            title,
            description,
            link,
            link_text,
            domain,
        }
    }
}

fn extract_domain(url: &str) -> Result<String, Box<dyn Error>> {
    let parsed_url = Url::parse(url)?;
    let host = parsed_url.host_str().ok_or("No host found")?;
    Ok(host.to_string())
}

pub struct DuckDuckGoLiteClient {
    client: Client,
    base_url: String,
}

impl DuckDuckGoLiteClient {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .build()
                .unwrap(),
            base_url: "https://lite.duckduckgo.com/lite/".to_string(),
        }
    }

    pub async fn search(self, search_term: String) -> Result<Vec<SearchResult>, String> {
        let encoded_term = urlencoding::encode(&search_term);
        let url = format!("{}?q={}", self.base_url, encoded_term);
        let request = self.client.request(reqwest::Method::GET, &url);

        let response = request.send().await.unwrap();
        let body = response.text().await.map_err(|e| e.to_string()).unwrap();

        let document = scraper::Html::parse_document(&body);

        let mut results = Vec::new();

        // Select all table rows
        let row_selector = Selector::parse("tr").map_err(|e| e.to_string())?;
        let link_selector = Selector::parse("a.result-link").map_err(|e| e.to_string())?;
        // let out_link_selector = Selector::parse("a.result-link").map_err(|e| e.to_string())?;
        let snippet_selector = Selector::parse("td.result-snippet").map_err(|e| e.to_string())?;
        let link_text_selector = Selector::parse("span.link-text").map_err(|e| e.to_string())?;

        let rows: Vec<_> = document.select(&row_selector).collect();
        // let link = String::from("https:".to_owned() + link_element.value().attr("href").unwrap_or(""));

        // Process rows in groups - each result spans multiple rows
        let mut i = 0;
        while i < rows.len() {
            let current_row = rows[i];

            // Look for the link in current row
            if let Some(link_element) = current_row.select(&link_selector).next() {
                let title = link_element.inner_html();
                // let link = link_element.value().attr("href").unwrap_or("").to_string();
                let link = String::from(
                    "https:".to_owned() + link_element.value().attr("href").unwrap_or(""),
                );

                // Look for description and link text in subsequent rows
                let mut description = String::new();
                let mut link_text = String::new();
                let mut j = i + 1;

                while j < rows.len() {
                    if let Some(snippet_element) = rows[j].select(&snippet_selector).next() {
                        description = snippet_element.inner_html();
                    }

                    if let Some(link_text_element) = rows[j].select(&link_text_selector).next() {
                        link_text = link_text_element.inner_html();
                    }

                    // Break if we found both or if we've gone too far
                    if (!description.is_empty() && !link_text.is_empty()) || j > i + 5 {
                        break;
                    }
                    j += 1;
                }

                // Clean up HTML entities and tags from all text fields
                let clean_title = clean_html_text(&title);
                let clean_description = clean_html_text(&description);
                let clean_link_text = clean_html_text(&link_text);

                if !clean_title.is_empty() && !link.is_empty() {
                    let result =
                        SearchResult::new(clean_title, clean_description, link, clean_link_text);
                    if results.len() >= 5 {
                        break;
                    }
                    results.push(result);
                }
            }

            i += 1;
        }
        // for (index, result) in results.iter().enumerate() {
        //     println!("Result {}:", index + 1);
        //     println!("Title: {}", result.title);
        //     println!("Description: {}", result.description);
        //     println!("Link: {}", result.link);
        //     println!("Domain: {}", result.domain);
        //     println!("{}", "-".repeat(80));
        // }

        Ok(results)
    }
}
