import { SearchForm } from "@/components/SearchForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Find Leads</CardTitle>
          <CardDescription>
            Search Google Maps for qualified local businesses in your target area.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SearchForm />
        </CardContent>
      </Card>
    </div>
  );
}
