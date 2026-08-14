import { FormEvent, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/apiBase';

type Props = {
  token: string | null;
};

type SubmitResult = {
  id: number;
  createdAt: string;
  message: string;
};

export default function SupportPage({ token }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SubmitResult | null>(null);

  const endpoint = useMemo(() => `${API_URL}/api/support/reports`, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await axios.post(
        endpoint,
        {
          name,
          email,
          subject,
          description,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      setResult(res.data);
      setSubject('');
      setDescription('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Unable to submit report. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="support-page">
      <div className="support-card">
        <h2 className="support-title">Help &amp; Support</h2>
        <p className="support-subtitle">
          Report platform issues here. Include as much detail as possible so we can investigate quickly.
        </p>

        {result && (
          <div className="support-success">
            Report submitted successfully. Reference ID: <strong>{result.id}</strong>
          </div>
        )}
        {error && <div className="support-error">{error}</div>}

        <form className="support-form" onSubmit={onSubmit}>
          <div className="support-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="support-name">Name (optional)</label>
              <input
                id="support-name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="support-email">Email (optional)</label>
              <input
                id="support-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@andrew.cmu.edu"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="support-subject">Subject</label>
            <input
              id="support-subject"
              className="form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={180}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="support-description">Description</label>
            <textarea
              id="support-description"
              className="form-input form-textarea support-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              required
            />
          </div>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
}
