import { useState, useEffect } from "react";
import "./App.css";
import { db } from "./config/firebase";
import { getDocs, collection, addDoc } from "firebase/firestore";
import { MailForm } from "./components/MailForm";
import { MailList } from "./components/MailList";

function App() {
  const [mailList, setMailList] = useState([]);
  const mailsCollectionRef = collection(db, "mails");

  // ✅ Fetch mails
  const getMailList = async () => {
    try {
      const data = await getDocs(mailsCollectionRef);
      const mails = data.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setMailList(mails);
    } catch (err) {
      console.error("Error fetching mails:", err);
    }
  };

  useEffect(() => {
    getMailList();
  }, []);

  // ✅ Add new mail
  const addMail = async (input, output) => {
    try {
      await addDoc(mailsCollectionRef, {
        input,
        output,
      });
      getMailList();
    } catch (err) {
      console.error("Error adding mail:", err);
    }
  };

  return (
    <div className="App">
      <h1>📧 Firebase Mail App</h1>
      <MailForm onAdd={addMail} />
      <MailList mails={mailList} />
    </div>
  );
}

export default App;
