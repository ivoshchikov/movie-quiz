// frontend/src/App.tsx
import { useEffect, useState } from "react";

type Question = {
  id: number;
  image_url: string;
  options: string[];
};

export default function App() {
  const [q, setQ] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [status, setStatus] = useState<"ready" | "sent" | "done">("ready");

  // загружаем вопрос при первом рендере
  useEffect(() => {
    fetch("/question")
      .then((r) => r.json())
      .then(setQ)
      .catch(console.error);
  }, []);

  if (!q) return <p> загружаю… </p>;

  const sendAnswer = () => {
    if (!answer) return;
    setStatus("sent");
    fetch("/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: q.id, answer }),
    })
      .then((r) => r.json())
      .then((res) => {
        setStatus("done");
        alert(res.correct ? "Верно!" : "Увы :(");
      })
      .catch(console.error);
  };

  return (
    <main style={{ maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
      <img src={q.image_url} alt="frame" style={{ width: "100%" }} />
      <div style={{ marginTop: 16 }}>
        {q.options.map((opt) => (
          <button
            key={opt}
            disabled={status !== "ready"}
            style={{ display: "block", width: "100%", margin: "8px 0" }}
            onClick={() => setAnswer(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {answer && status === "ready" && (
        <button onClick={sendAnswer}>Отправить</button>
      )}
    </main>
  );
}
