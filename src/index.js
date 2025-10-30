import React from "react"; // 6.9k (gzipped: 2.7k)
import ReactDOM from "react-dom/client"; // 513 (gzipped: 319)
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);