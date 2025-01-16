import React, { useState } from 'react';

const BidQuestionForm: React.FC = () => {
  const [bidQuestion, setBidQuestion] = useState('');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('api/api/identify-projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: bidQuestion,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch');
      }

      const data = await response.json();
      setApiResponse(data);
    } catch (err) {
      setError('An error occurred while submitting the bid question.');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      margin: 0,
      padding: 0,
    }}>
      {/* Left side - Form */}
      <div style={{
        width: '50%',
        padding: '40px',
        boxSizing: 'border-box',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '24px',
          marginTop: 0
        }}>
          Bid Question Form
        </h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="bidQuestion"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px'
              }}
            >
              Enter your bid question (100-200 words):
            </label>
            <textarea
              id="bidQuestion"
              value={bidQuestion}
              onChange={(e) => setBidQuestion(e.target.value)}
              style={{
                width: '100%',
                height: '200px',
                padding: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                lineHeight: '1.5',
                resize: 'vertical'
              }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              fontSize: '14px'
            }}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
          {error && (
            <p style={{
              color: 'red',
              marginTop: '12px',
              fontSize: '14px'
            }}>
              {error}
            </p>
          )}
        </form>
      </div>

      {/* Right side - Response */}
      <div style={{
        width: '50%',
        backgroundColor: '#f8f9fa',
        padding: '40px',
        boxSizing: 'border-box',
        borderLeft: '1px solid #e5e7eb',
        minHeight: '100%'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 600,
          marginBottom: '24px',
          marginTop: 0
        }}>
          API Response:
        </h2>
        <div style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
          height: 'calc(100vh - 140px)',
          overflow: 'auto'
        }}>
          {apiResponse ? (
            <TextRenderer text={apiResponse.response}/>
          ) : (
            <span style={{ color: '#666' }}>
              No response yet. Submit a bid question to see the results.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface TextRendererProps {
  text: string;
}

const TextRenderer: React.FC<TextRendererProps> = ({ text }) => {
  // Split the text by newline characters
  const paragraphs = text.split('\\n\\n').map((paragraph, index) => (
    <p key={index}>
      {paragraph.split('\\n').map((line, lineIndex) => (
        <React.Fragment key={lineIndex}>
          {line}
          <br />
        </React.Fragment>
      ))}
    </p>
  ));

  return <div>{paragraphs}</div>;
};

export default BidQuestionForm;

