import ProtectedRoute from "@/components/ProtectedRoute";

export default function PropertiesPage() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-[1140px] px-4 py-6 md:py-8">
        {/* Your properties content */}
      </div>
    </ProtectedRoute>
  );
}
