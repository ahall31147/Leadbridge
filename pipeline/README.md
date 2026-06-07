# LeadBridge Reddit Ingestion Pipeline

This prototype demonstrates an automated pipeline for collecting real estate leads from Reddit and structuring them using LLM-based extraction.

## Features
- **Scraping**: Uses `praw` to search for housing intent keywords ('moving to', 'looking for apartment', etc.) in target subreddits.
- **Extraction**: Uses Google Gemini (1.5 Flash) to parse unstructured post text into a structured JSON schema.
- **Fallback**: Includes a mock data mode for `austin`, `atlanta`, and `denver` and heuristic extraction if API keys are not provided.

## Setup

1.  **Virtual Environment**:
    ```bash
    cd /home/team/shared/pipeline/
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

2.  **Environment Variables**:
    To run with real data, set the following:
    ```bash
    export REDDIT_CLIENT_ID='your_id'
    export REDDIT_CLIENT_SECRET='your_secret'
    export GOOGLE_API_KEY='your_gemini_key'
    ```

## Usage

Run the pipeline for a specific city or the default list (`austin`, `atlanta`, `denver`):

```bash
# Run for a specific city
/home/team/shared/pipeline/venv/bin/python /home/team/shared/pipeline/ingest.py --city austin

# Run for all default cities
/home/team/shared/pipeline/venv/bin/python /home/team/shared/pipeline/ingest.py
```

The ingested leads will be saved to `/home/team/shared/pipeline/ingested-leads.json`.

## Schema
The output matches the `LeadBatch` schema defined in `shared/sample-leads.schema.json`.
