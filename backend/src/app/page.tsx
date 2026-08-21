export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 640 }}>
      <p style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 12 }}>Vistar</p>
      <h1>Kitchen API</h1>
      <p>
        This process is the café floor. Guest phones and <code>/admin</code> both talk to{" "}
        <code>/api</code> so every step stays in sync.
      </p>
      <ul>
        <li>
          Health: <a href="/api/health">/api/health</a>
        </li>
        <li>
          Menu: <a href="/api/menu">/api/menu</a>
        </li>
      </ul>
      <p>Default port is 3001. The café app proxies <code>/api</code> here.</p>
    </main>
  );
}
