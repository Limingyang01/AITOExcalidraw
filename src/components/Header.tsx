'use client';

export default function Header() {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      backgroundColor: '#fff',
      borderBottom: '1px solid #e5e7eb',
      height: '56px',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img
          src="/logo.png"
          alt="AI Excalidraw"
          style={{ width: '28px', height: '28px', objectFit: 'contain' }}
        />
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937', margin: 0 }}>AI Excalidraw</h1>
      </div>
    </header>
  );
}
