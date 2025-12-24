type Params = Promise<{ slug: string }>;

export default async function OrganizationPage({ params }: { params: Params }) {
  const { slug } = await params;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-2xl">Courses</h1>
    </div>
  );
}
