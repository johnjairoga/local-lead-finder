import { SearchForm } from "@/components/SearchForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Find Leads</CardTitle>
          <CardDescription>
            Enter your niche and location to grow your lead database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SearchForm />
        </CardContent>
      </Card>
    </div>
  );
}
