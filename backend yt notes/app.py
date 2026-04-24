from flask import Flask, jsonify # type: ignore
from flask_cors import CORS # type: ignore
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound # type: ignore
from openai import OpenAI # type: ignore
import os
from dotenv import load_dotenv # type: ignore
import json
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response
# CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route("/notes/<video_id>")
def get_notes(video_id):
    try:
        # Instantiate the API
        api = YouTubeTranscriptApi()

        # List transcripts for the video
        transcript_list = api.list(video_id)

        # Find English transcript
        # 🔥 Get ANY available transcript (best option)
        try:
            transcript = transcript_list.find_transcript(["en"])
        except:
            transcript = transcript_list.find_transcript(
                [t.language_code for t in transcript_list]
            )
        transcript_data = transcript.fetch()

        # 🔑 Updated: access .text attribute
        full_text = " ".join([snippet.text for snippet in transcript_data])
        full_text = full_text.replace("\n", " ").replace("[", "").replace("]", "")
        # 🔥 LIMIT TRANSCRIPT SIZE (prevents crashes)
        MAX_CHARS = 12000   # ~ safe for gpt-4o-mini

        was_truncated = False

        if len(full_text) > MAX_CHARS:
            full_text = full_text[:MAX_CHARS]
            was_truncated = True
        

        # Call OpenAI
        response = client.chat.completions.create(
    model="gpt-4o-mini",
    max_tokens=800,
   messages=[
    {
        "role": "system",
        "content": "You are an expert teacher who creates exam-ready, structured study notes from lecture transcripts."
    },
    {
        "role": "user",
        "content": f"""
Convert this transcript into structured, exam-ready study notes.

Return STRICT JSON in this format:

{{
  "title": "Clear topic name",
  "summary": "2-3 sentence high-level overview",
  "sections": [
    {{
      "heading": "Section name (e.g., Definition, Properties, Types, Examples)",
      "points": [
        "Clear, exam-ready explanation",
        "Include definitions, properties, behaviors where relevant",
        "Use simple, easy-to-understand language"
      ]
    }}
  ]
}}

Guidelines:
- Focus ONLY on important, exam-relevant information
- IGNORE filler, jokes, repetition, and storytelling
- Group related ideas into sections
- Use headings like:
  - Definition
  - Key Concepts
  - Properties
  - Types
  - Examples
  - Applications
- Each point must be clear and self-contained
- Do NOT just rewrite the transcript
- Do NOT include unnecessary sentences
- Write points in an exam-ready style:
  - Prefer definitions, facts, rules, and clear statements
  - Avoid vague sentences like "helps in understanding"
- Keep sentences concise and direct
- Prioritize information that can be memorized or written in exams

Transcript:
{full_text}
"""
    },
],
)

        # notes = response.choices[0].message.content
        # return jsonify({"notes": notes})
        raw_output = response.choices[0].message.content

# 🔑 Remove ```json ``` wrappers if present
        cleaned = re.sub(r"```json|```", "", raw_output).strip()

        try:
            parsed = json.loads(cleaned)
            # 🔥 Attach metadata for frontend
            parsed["truncated"] = was_truncated
            return jsonify(parsed)
        except Exception as e:
            return jsonify({
                "error": "Failed to parse AI response",
                "raw": raw_output
            }), 500

    except (TranscriptsDisabled, NoTranscriptFound):
        return jsonify({"error": "Transcript not available for this video"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# For testing in local running environment, useless when using Render
if __name__ == "__main__":
    app.run(port=5000, debug=True)