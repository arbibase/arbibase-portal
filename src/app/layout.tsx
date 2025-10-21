import "./globals.css";

export const metadata = {
  title: "ArbiBase Portal",
  description: "Property management portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          async
          defer
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        ></script>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}