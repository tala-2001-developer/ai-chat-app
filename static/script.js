const log = document.getElementById("log");
const empty = document.getElementById("empty");
const form = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
let history = [];
let busy = false;

function addMessage(role, text = "") {
  empty.hidden = true;
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

async function send(text) {
  if (busy || !text.trim()) return;
  busy = true;
  sendBtn.disabled = true;
  history.push({ role: "user", content: text });
  addMessage("user", text);
  const bubble = addMessage("assistant");
  bubble.classList.add("pending");
  let reply = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Request failed.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop();
      for (const ev of events) {
        const payload = ev.replace(/^data: /, "");
        if (payload === "[DONE]") continue;
        const data = JSON.parse(payload);
        if (data.error) throw new Error(data.error);
        reply += data.text;
        bubble.textContent = reply;
        log.scrollTop = log.scrollHeight;
      }
    }
    history.push({ role: "assistant", content: reply });
  } catch (err) {
    bubble.classList.add("error");
    bubble.textContent = err.message + " Your message was not saved. Send it again.";
    history.pop(); // drop the unanswered user turn
  } finally {
    bubble.classList.remove("pending");
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value;
  input.value = "";
  input.style.height = "auto";
  send(text);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
});

document.querySelectorAll(".suggestions button").forEach((b) =>
  b.addEventListener("click", () => send(b.textContent))
);

document.getElementById("clear").addEventListener("click", () => {
  history = [];
  log.querySelectorAll(".msg").forEach((m) => m.remove());
  empty.hidden = false;
});
