import React from 'react';

type DigestProps = {
  spotlights: Array<{ name: string; location: string; monthlyRev: number | null }>;
  markets: Array<{ label: string; score: number }>;
  recipientName: string;
};

export default function DealDigestEmail({ spotlights, markets, recipientName }: DigestProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Your Daily Deal Digest</title>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#0a141d' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              display: 'inline-block',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '20px',
              lineHeight: '40px',
              marginBottom: '12px'
            }}>
              A
            </div>
            <h1 style={{ color: '#fff', fontSize: '24px', margin: '8px 0' }}>
              Your Daily Deal Digest
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
              Hi {recipientName}, here's what's hot today
            </p>
          </div>

          {/* Spotlights */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px' }}>
              🔥 Top Properties
            </h2>
            {spotlights.map((spot, i) => (
              <div 
                key={i}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px'
                }}
              >
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                  {spot.name}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
                  {spot.location}
                </div>
                {spot.monthlyRev && (
                  <div style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                    Projected: ${spot.monthlyRev.toLocaleString()}/mo
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Markets */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px' }}>
              📊 Hot Markets
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {markets.map((market, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    color: '#10b981',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {market.label} {market.score}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <a 
              href="https://portal.arbibase.com/properties"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #00e1ff, #3b82f6)',
                color: '#041018',
                padding: '12px 32px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              View All Properties
            </a>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
              You're receiving this because you opted into the Deal Digest.
            </p>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '8px 0 0 0' }}>
              <a href="https://portal.arbibase.com/account" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                Update preferences
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

// TODO: Cron integration
// Create /api/cron/send-digest route to:
// 1. Query users with digest_cadence = 'daily' | 'weekly'
// 2. Fetch top spotlights and markets for each user
// 3. Render this component to HTML
// 4. Send via email provider (SendGrid, Resend, etc.)
// 5. Add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/send-digest",
//     "schedule": "0 9 * * *"
//   }]
// }