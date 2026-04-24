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
    // const response = await fetch(`https://your-app-name.onrender.com/notes/${id}`);
    // const response = await fetch(`https://yt-notes-app-qpas.onrender.com/notes/${id}`);
    const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://127.0.0.1:5000"
    : import.meta.env.VITE_API_BASE;
    const response = await fetch(`${API_BASE}/notes/${id}`);
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
  if (!notes || !notes.sections) return;

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

  notes.sections.forEach((section) => {
  doc.text(section.heading, 10, y);
  y += 8;

  section.points.forEach((point) => {
    const lines = doc.splitTextToSize(`• ${point}`, 180);
    doc.text(lines, 10, y);
    y += lines.length * 7;

    if (y > 280) {
      doc.addPage();
      y = 10;
    }
  });

  y += 5;
});

  doc.save(`${notes.title || "notes"}.pdf`);
};
const isDev = import.meta.env.MODE === "development";
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
  // 🔥 DEV MODE = NO LIMIT
  if (isDev) return false;

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
        Turn messy YouTube lectures into clear, exam-ready notes in seconds
      </h1>
      <h4 className="sub-heading">Paste a video link and get structured notes with key concepts, examples, and summaries</h4>

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
  Generation(s) remaining for today : {getRemaining()}
</p>
      <div className="output">
        {error && <div style={{ color: "red" }}>{error}</div>}
        {notes && notes.sections && (
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
  notes.sections ? (
    <div className="notes">
      <h2>{notes.title}</h2>
      {notes.truncated && (
  <div style={{ color: "orange", marginBottom: "10px" }}>
    ⚠️ Only the first part of this long video was used to generate notes
  </div>
)}

      <p><strong>Summary:</strong> {notes.summary}</p>

      {
  notes.sections.map((section, i) => (
    <div key={i}>
      <h3>{section.heading}</h3>
      <ul>
        {section.points.map((point, j) => (
          <li key={j}>{point}</li>
        ))}
      </ul>
    </div>
  ))
}
    </div>
  ) : (
    <div style={{ color: "red" }}>
      {typeof notes === "string" ? notes : JSON.stringify(notes)}
    </div>
  )
) : (
  "Your notes will appear here..."
)}
{notes && (
  <div className="feedback-container">
    <a
      href="https://forms.gle/sqXMK3tqErgeHtr28"
      target="_blank"
      rel="noopener noreferrer"
      className="button"
      style={{ marginTop: "20px", display: "inline-block" }}
    >
      Help us improve 🚀
    </a>
  </div>
)}
      </div>
    </div>
  );
}

export default App;