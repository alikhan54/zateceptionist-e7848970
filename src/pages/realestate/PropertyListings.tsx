import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRealEstateListings, REListing } from "@/hooks/useRealEstateListings";
import { useToast } from "@/hooks/use-toast";
import { Home, Search, Plus, Bed, Bath, Car, MapPin, DollarSign, Building2 } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";

const formatAED = (amount: number) => `AED ${amount.toLocaleString()}`;

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  under_offer: "bg-yellow-100 text-yellow-800",
  sold: "bg-blue-100 text-blue-800",
  rented: "bg-purple-100 text-purple-800",
  draft: "bg-gray-100 text-gray-800",
  expired: "bg-red-100 text-red-800",
};

export default function PropertyListings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<{ community?: string; property_type?: string; purpose?: string; status?: string }>({});
  const [showAdd, setShowAdd] = useState(false);
  const { listings, isLoading, stats, createListing } = useRealEstateListings(searchTerm, filters);
  const { toast } = useToast();

  const [form, setForm] = useState({ title: "", property_type: "apartment", purpose: "sale", community: "", bedrooms: 0, bathrooms: 0, size_sqft: 0, price: 0, furnishing: "unfurnished" });

  const handleAdd = async () => {
    if (!form.title || !form.price) {
      toast({ title: "Error", description: "Title and price are required", variant: "destructive" });
      return;
    }
    try {
      await createListing.mutateAsync({
        title: form.title,
        property_type: form.property_type,
        purpose: form.purpose,
        community: form.community,
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        size_sqft: form.size_sqft,
        price: form.price,
        furnishing: form.furnishing,
        price_per_sqft: form.size_sqft > 0 ? Math.round(form.price / form.size_sqft) : undefined,
      } as Partial<REListing>);
      setShowAdd(false);
      setForm({ title: "", property_type: "apartment", purpose: "sale", community: "", bedrooms: 0, bathrooms: 0, size_sqft: 0, price: 0, furnishing: "unfurnished" });
      toast({ title: "Success", description: "Listing created" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Listings</h1>
          <p className="text-muted-foreground">Manage your property inventory</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Listing</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Listing</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="2BR Apartment in Marina" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Type</Label><Select value={form.property_type} onValueChange={v => setForm(f => ({ ...f, property_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="apartment">Apartment</SelectItem><SelectItem value="villa">Villa</SelectItem><SelectItem value="townhouse">Townhouse</SelectItem><SelectItem value="penthouse">Penthouse</SelectItem><SelectItem value="plot">Plot</SelectItem><SelectItem value="office">Office</SelectItem></SelectContent></Select></div>
                <div><Label>Purpose</Label><Select value={form.purpose} onValueChange={v => setForm(f => ({ ...f, purpose: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sale">Sale</SelectItem><SelectItem value="rent">Rent</SelectItem></SelectContent></Select></div>
              </div>
              <div><Label>Community</Label><Input value={form.community} onChange={e => setForm(f => ({ ...f, community: e.target.value }))} placeholder="Dubai Marina" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Beds</Label><Input type="number" value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: +e.target.value }))} /></div>
                <div><Label>Baths</Label><Input type="number" value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: +e.target.value }))} /></div>
                <div><Label>Size (sqft)</Label><Input type="number" value={form.size_sqft} onChange={e => setForm(f => ({ ...f, size_sqft: +e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Price (AED)</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} /></div>
                <div><Label>Furnishing</Label><Select value={form.furnishing} onValueChange={v => setForm(f => ({ ...f, furnishing: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="furnished">Furnished</SelectItem><SelectItem value="semi_furnished">Semi Furnished</SelectItem><SelectItem value="unfurnished">Unfurnished</SelectItem></SelectContent></Select></div>
              </div>
              <Button onClick={handleAdd} disabled={createListing.isPending}>{createListing.isPending ? "Adding..." : "Add Listing"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search properties..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filters.purpose || "all"} onValueChange={v => setFilters(f => ({ ...f, purpose: v === "all" ? undefined : v }))}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Purpose" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="sale">Sale</SelectItem><SelectItem value="rent">Rent</SelectItem></SelectContent>
        </Select>
        <Select value={filters.property_type || "all"} onValueChange={v => setFilters(f => ({ ...f, property_type: v === "all" ? undefined : v }))}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="apartment">Apartment</SelectItem><SelectItem value="villa">Villa</SelectItem><SelectItem value="townhouse">Townhouse</SelectItem><SelectItem value="penthouse">Penthouse</SelectItem><SelectItem value="plot">Plot</SelectItem></SelectContent>
        </Select>
        <Select value={filters.status || "all"} onValueChange={v => setFilters(f => ({ ...f, status: v === "all" ? undefined : v }))}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="under_offer">Under Offer</SelectItem><SelectItem value="sold">Sold</SelectItem><SelectItem value="rented">Rented</SelectItem></SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.activeListings}</div><p className="text-xs text-muted-foreground">Active Listings</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.forSale}</div><p className="text-xs text-muted-foreground">For Sale</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.forRent}</div><p className="text-xs text-muted-foreground">For Rent</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatAED(stats.avgPricePerSqft)}/sqft</div><p className="text-xs text-muted-foreground">Avg Price</p></CardContent></Card>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading listings...</p>
      ) : listings.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No listings found</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card key={listing.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{listing.title}</CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {listing.community}{listing.sub_community ? `, ${listing.sub_community}` : ""}
                    </p>
                  </div>
                  <Badge className={statusColors[listing.status] || "bg-gray-100"}>{listing.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    {formatAED(listing.price)}{listing.purpose === "rent" ? "/yr" : ""}
                  </span>
                  {listing.reference_number && <span className="text-xs text-muted-foreground">{listing.reference_number}</span>}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {listing.bedrooms > 0 && <span className="flex items-center gap-1"><Bed className="h-3 w-3" /> {listing.bedrooms}</span>}
                  {listing.bathrooms > 0 && <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> {listing.bathrooms}</span>}
                  {listing.parking_spaces > 0 && <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {listing.parking_spaces}</span>}
                  {listing.size_sqft && <span>{listing.size_sqft.toLocaleString()} sqft</span>}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex gap-1">
                    <Badge variant="outline">{listing.property_type}</Badge>
                    <Badge variant="outline">{listing.purpose}</Badge>
                    {listing.is_offplan && <Badge className="bg-amber-100 text-amber-800">Off-Plan</Badge>}
                  </div>
                  {listing.listing_agent_name && <span className="text-muted-foreground">{listing.listing_agent_name}</span>}
                </div>
                {listing.view_type && <p className="text-xs text-muted-foreground capitalize">{listing.view_type.replace("_", " ")}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </RTLWrapper>
  );
}
