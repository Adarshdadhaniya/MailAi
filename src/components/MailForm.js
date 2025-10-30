import { useState } from "react";

export const MailForm = ({ onAdd }) => {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");

  const handleSubmit = () => {
    if (!inputText.trim() || !outputText.trim()) {
      alert("Both input and output are required!");
      return;
    }
    onAdd(inputText, outputText);
    setInputText("");
    setOutputText("");
  };

  return (
    <div className="mail-form">
      <h2>➕ Add New Mail</h2>
      <input
        placeholder="Input..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />
      <input
        placeholder="Output..."
        value={outputText}
        onChange={(e) => setOutputText(e.target.value)}
      />
      <button onClick={handleSubmit}>Add Mail</button>
    </div>
  );
};
