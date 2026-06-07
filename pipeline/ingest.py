import os
import json
import argparse
import praw
import google.generativeai as genai
from datetime import datetime

# Lead Schema Definition (Matches shared/sample-leads.schema.json)
LEAD_SCHEMA = {
    "name": "string",
    "email": "string",
    "phone": "string",
    "intent": "Buyer | Renter",
    "area": "string",
    "zip": "string",
    "budget_range": "string",
    "timeline": "string",
    "qualification_notes": "string",
    "source": "string"
}

def get_mock_posts(city):
    """Fallback mock data for Reddit posts if API keys are missing."""
    mocks = {
        "austin": [
            {"title": "Moving to Austin in August, looking for a 1BR", "selftext": "Hi all! I'm moving for a new job. Budget is around $2k/mo. Any neighborhood recommendations?", "author": "atx_newcomer", "url": "https://reddit.com/mock1"},
            {"title": "Where to buy a house with $600k budget?", "selftext": "Thinking about Cedar Park or Round Rock. Family of 4.", "author": "home_hunter_512", "url": "https://reddit.com/mock2"}
        ],
        "atlanta": [
            {"title": "Relocating to Atlanta, ISO rental in Buckhead", "selftext": "Budget is $3k. Need 2 bedrooms. Moving in July.", "author": "atl_bound", "url": "https://reddit.com/mock3"}
        ],
        "denver": [
            {"title": "House hunting in Denver metro", "selftext": "Looking for a 3BR under $700k. Any advice on Arvada vs Lakewood?", "author": "mile_high_buyer", "url": "https://reddit.com/mock4"}
        ]
    }
    return mocks.get(city.lower(), [])

def scrape_reddit(cities, limit=5):
    """Scrapes Reddit for housing intent posts."""
    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    user_agent = "LeadBridge Ingestion Prototype v0.1"

    posts = []
    
    if not client_id or not client_secret:
        print("REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET not found. Using MOCK data.")
        for city in cities:
            posts.extend([(city, p) for p in get_mock_posts(city)])
        return posts

    reddit = praw.Reddit(
        client_id=client_id,
        client_secret=client_secret,
        user_agent=user_agent
    )

    for city in cities:
        subreddit = reddit.subreddit(city)
        # Search for intent keywords requested by lead
        query = "'moving to' OR 'looking for apartment' OR 'house hunting' OR 'ISO rental'"
        for submission in subreddit.search(query, sort="new", limit=limit):
            posts.append((city, {
                "title": submission.title,
                "selftext": submission.selftext,
                "author": submission.author.name if submission.author else "anonymous",
                "url": submission.url
            }))
    
    return posts

def extract_lead_with_llm(post_data, city):
    """Uses Gemini to extract lead data from Reddit post text."""
    api_key = os.getenv("GOOGLE_API_KEY")
    
    prompt = f"""
    Extract real estate lead information from this Reddit post in {city}.
    Post Title: {post_data['title']}
    Post Content: {post_data['selftext']}
    Author: {post_data['author']}
    URL: {post_data['url']}

    Return a JSON object matching this schema:
    {{
        "name": "Username or 'Unknown'",
        "email": "Extracted email or 'contact@example.com' (placeholder)",
        "phone": "Extracted phone or '(000) 000-0000' (placeholder)",
        "intent": "Buyer" or "Renter",
        "area": "Specific neighborhood or City name",
        "zip": "Zip code if mentioned, else 'Unknown'",
        "budget_range": "Price mentioned or 'Unknown'",
        "timeline": "Move date mentioned or 'Unknown'",
        "qualification_notes": "A brief summary of their situation",
        "source": "Reddit r/{city}"
    }}
    Only return the JSON.
    """

    if not api_key:
        # Fallback heuristic extraction for prototype
        intent = "Buyer" if any(k in post_data['title'].lower() or k in post_data['selftext'].lower() for k in ["buy", "house", "hunting"]) else "Renter"
        return {
            "name": post_data['author'],
            "email": f"{post_data['author']}@example.com",
            "phone": "(000) 000-0000",
            "intent": intent,
            "area": city.capitalize(),
            "zip": "Unknown",
            "budget_range": "Check post for details",
            "timeline": "Unknown",
            "qualification_notes": post_data['title'],
            "source": f"Reddit r/{city} (Heuristic Extraction)"
        }

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    
    try:
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
        return json.loads(text)
    except Exception as e:
        print(f"Error parsing LLM response: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="LeadBridge Reddit Ingestion Pipeline")
    parser.add_argument("--city", help="Target city subreddit (e.g. austin, atlanta, denver)")
    parser.add_argument("--limit", type=int, default=5, help="Number of posts per city")
    parser.add_argument("--output", default="/home/team/shared/pipeline/ingested-leads.json", help="Output JSON file")
    
    args = parser.parse_args()

    cities = [args.city] if args.city else ["austin", "atlanta", "denver"]

    print(f"Starting ingestion for: {', '.join(cities)}...")
    raw_posts = scrape_reddit(cities, limit=args.limit)
    
    leads = []
    for city, post in raw_posts:
        print(f"Processing post from r/{city}: {post['title'][:50]}...")
        lead = extract_lead_with_llm(post, city)
        if lead:
            leads.append(lead)
    
    output_data = {"leads": leads, "ingested_at": datetime.now().isoformat()}
    
    with open(args.output, "w") as f:
        json.dump(output_data, f, indent=2)
    
    print(f"Successfully ingested {len(leads)} leads to {args.output}")

if __name__ == "__main__":
    main()
