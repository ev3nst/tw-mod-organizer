use bincode::{Encode, Decode};

#[derive(Encode, Decode)]
pub struct JsonWrapper {
    pub json_string: String,
}

impl From<serde_json::Value> for JsonWrapper {
    fn from(value: serde_json::Value) -> Self {
        JsonWrapper {
            json_string: serde_json::to_string(&value).unwrap_or_default(),
        }
    }
}
