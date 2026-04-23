import { useState } from "react";
import "./App.css";
import jsPDF from "jspdf";

// import { Linter } from "eslint";

function App() {
  const [url, setUrl] = useState("");
  // const [videoId, setVideoId] = useState("");
  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

const handleGenerate = async () => {
  setError(""); // 🔥 clear old errors

  const id = getYouTubeVideoId(url);

  if (!id) {
    setError("Invalid YouTube URL");
    return;
  }

  // 🔥 CHECK LIMIT BEFORE API CALL
  if (hasReachedLimit()) {
    setError("Free limit reached. Try again tomorrow.");
    return;
  }

  setLoading(true);
  setNotes(""); // clear old notes

  try {
    // const response = await fetch(`http://127.0.0.1:5000/notes/${id}`);
        const response = await fetch(`https://your-app-name.onrender.com/notes/${id}`);
    const data = await response.json();

    if (data.error) {
      setError(data.error); // 🔥 clean error handling
      return;
    }

    setNotes(data);

    // 🔥 ONLY increment AFTER SUCCESS
    incrementUsage();

  } catch (err) {
    console.error(err);
    setError("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};

  function getYouTubeVideoId(url) {
    const regex =
      /(?:youtube\.com\/(?:.*v=|.*\/|.*embed\/)|youtu\.be\/)([^"&?/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
const handleDownloadPDF = () => {
  if (!notes || !notes.key_points) return;

  const doc = new jsPDF();

  let y = 10;

  // Title
  doc.setFontSize(16);
  doc.text(notes.title, 10, y);
  y += 10;

  // Summary
  doc.setFontSize(12);
  doc.text("Summary:", 10, y);
  y += 8;

  const summaryLines = doc.splitTextToSize(notes.summary, 180);
  doc.text(summaryLines, 10, y);
  y += summaryLines.length * 7;

  y += 5;

  // Key Points
  doc.text("Key Points:", 10, y);
  y += 8;

  notes.key_points.forEach((point) => {
    const lines = doc.splitTextToSize(`• ${point}`, 180);
    doc.text(lines, 10, y);
    y += lines.length * 7;

    // Prevent overflow
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
  });

  doc.save(`${notes.title || "notes"}.pdf`);
};
// 🔥 DAILY LIMIT CONFIG
const DAILY_LIMIT = 3;

// 🔥 Get today's date (YYYY-MM-DD)
const getToday = () => new Date().toISOString().split("T")[0];

// 🔥 Check current usage from localStorage
const checkUsage = () => {
  const today = getToday();
  let usage = JSON.parse(localStorage.getItem("usage"));

  // 🔥 If no usage exists → initialize
  if (!usage) {
    usage = { count: 0, date: today };
  }

  // 🔥 If it's a new day → reset usage
  if (usage.date !== today) {
    usage = { count: 0, date: today };
  }

  return usage;
};

// 🔥 Increase usage count after successful request
const incrementUsage = () => {
  const usage = checkUsage();
  usage.count += 1;
  localStorage.setItem("usage", JSON.stringify(usage));
};

// 🔥 Check if user has hit the daily limit
const hasReachedLimit = () => {
  const usage = checkUsage();
  return usage.count >= DAILY_LIMIT;
};

// 🔥 Get remaining usage
const getRemaining = () => {
  const usage = checkUsage();
  return DAILY_LIMIT - usage.count;
};
  return (
    <div className="container">
      <h1 className="heading">
        Turn hours of YouTube lectures into beautiful notes
      </h1>

      <div className="input-group">
        <input
          type="text"
          placeholder="Paste YouTube link here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="input"
        />
        <button
          onClick={handleGenerate}
          className="button"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Notes"}
        </button>
      </div>
<p className="usage-text">
  Generation(s) remaining today: {getRemaining()}
</p>
      <div className="output">
        {error && <div style={{ color: "red" }}>{error}</div>}
        {notes && notes.key_points && (
          <div className="download-container">
  <button onClick={handleDownloadPDF} className="button">
    Download PDF
  </button>
  </div>
)}
        {/* {videoId && <div>Video ID: {videoId}</div>} */}

{loading ? (
  <div>Generating notes... ⏳</div>
) : error ? null : notes ? (
  notes.key_points ? (
    <div className="notes">
      <h2>{notes.title}</h2>
      {notes.truncated && (
  <div style={{ color: "orange", marginBottom: "10px" }}>
    ⚠️ Only the first part of this long video was used to generate notes
  </div>
)}

      <p><strong>Summary:</strong> {notes.summary}</p>

      <ul>
        {notes.key_points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
    </div>
  ) : (
    <div style={{ color: "red" }}>
      {typeof notes === "string" ? notes : JSON.stringify(notes)}
    </div>
  )
) : (
  "Your notes will appear here..."
)}
      </div>
    </div>
  );
}

export default App;