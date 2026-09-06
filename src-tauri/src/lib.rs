#[cfg(feature = "desktop")]
mod commands;
#[cfg(feature = "desktop")]
mod desktop;
pub mod diagnostics;
mod error;
pub mod health;
#[cfg(any(feature = "desktop", test))]
mod logging;
pub mod ocr;
pub mod utils;

#[cfg(feature = "desktop")]
pub use desktop::run;
pub use error::{CommandError, CommandResult};
pub use health::{health_check, health_check_url};
