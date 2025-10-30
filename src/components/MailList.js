export const MailList = ({ mails }) => {
  return (
    <div className="mail-list">
      <h2>📜 Mail List</h2>
      {mails.length === 0 ? (
        <p>No mails yet.</p>
      ) : (
        mails.map((mail) => (
          <div key={mail.id} className="mail-item">
            <p><strong>Input:</strong> {mail.input}</p>
            <p><strong>Output:</strong> {mail.output}</p>
          </div>
        ))
      )}
    </div>
  );
};
