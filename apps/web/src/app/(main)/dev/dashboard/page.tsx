import RepoList from "@/components/dev/RepoList";

export default async function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              HostWeb Platform
            </h1>
            <div className="flex items-center gap-4"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Import Repository
          </h2>
          <p className="text-gray-600 mt-1">
            Select a repository to build and deploy as a widget
          </p>
        </div>

        <RepoList />
      </main>
    </div>
  );
}
