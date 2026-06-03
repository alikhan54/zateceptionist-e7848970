import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, HeartPulse, Phone, IdCard, ShieldCheck } from "lucide-react";

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

// The 5 structured screening conditions — each maps to clinic_patients.medical_<key> (bool)
// + medical_<key>_details (text). These booleans are the SOURCE OF TRUTH for screening flags
// (Phase 1 convention); the free-form allergies[] array is derived from the allergy details.
const MEDICAL = [
  { key: "heart_disease", label: "Heart disease / cardiac condition" },
  { key: "blood_pressure", label: "High / low blood pressure" },
  { key: "allergy", label: "Allergies (medication, latex, anaesthetic…)" },
  { key: "diabetes", label: "Diabetes" },
  { key: "other", label: "Other medical condition" },
] as const;

const UAE_EMIRATES = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"];
const FITZPATRICK = ["I", "II", "III", "IV", "V", "VI"];

type MedicalState = Record<string, { value: boolean; details: string }>;

const emptyMedical = (): MedicalState =>
  MEDICAL.reduce((acc, c) => ({ ...acc, [c.key]: { value: false, details: "" } }), {} as MedicalState);

export function PatientRegistrationDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (payload: Record<string, any>) => Promise<any>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("female");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("");
  const [country, setCountry] = useState("");
  const [emirate, setEmirate] = useState("");
  const [emiratesId, setEmiratesId] = useState("");
  const [address, setAddress] = useState("");
  const [fileNumber, setFileNumber] = useState("");
  const [language, setLanguage] = useState("en");
  const [skinType, setSkinType] = useState("");
  const [fitz, setFitz] = useState("");
  const [medical, setMedical] = useState<MedicalState>(emptyMedical);
  const [ecName, setEcName] = useState("");
  const [ecNumber, setEcNumber] = useState("");
  const [ecRel, setEcRel] = useState("");
  const [interests, setInterests] = useState("");
  const [photoConsent, setPhotoConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [notes, setNotes] = useState("");

  const reset = () => {
    setFullName(""); setDob(""); setGender("female"); setPhone(""); setEmail("");
    setNationality(""); setCountry(""); setEmirate(""); setEmiratesId(""); setAddress("");
    setFileNumber(""); setLanguage("en"); setSkinType(""); setFitz(""); setMedical(emptyMedical());
    setEcName(""); setEcNumber(""); setEcRel(""); setInterests("");
    setPhotoConsent(false); setMarketingConsent(false); setNotes("");
  };

  const setMed = (key: string, patch: Partial<{ value: boolean; details: string }>) =>
    setMedical((m) => ({ ...m, [key]: { ...m[key], ...patch } }));

  const submit = async () => {
    if (!fullName.trim()) { toast({ title: "Full name is required", variant: "destructive" }); return; }
    if (!phone.trim()) { toast({ title: "Phone is required", variant: "destructive" }); return; }

    const interestList = interests.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    const allergyDetails = medical.allergy.value ? medical.allergy.details.trim() : "";
    // Keep the free-form allergies[] array in sync so the existing allergy banner / cards work.
    const allergyArray = allergyDetails ? allergyDetails.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) : null;

    const payload: Record<string, any> = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      date_of_birth: dob || null,
      gender: gender || null,
      nationality: nationality.trim() || null,
      country_of_residence: country.trim() || null,
      emirate: emirate || null,
      emirates_id: emiratesId.trim() || null,
      address: address.trim() || null,
      file_number: fileNumber.trim() || null,
      language,
      skin_type: skinType || null,
      fitzpatrick_type: fitz || null,
      emergency_contact_name: ecName.trim() || null,
      emergency_contact_number: ecNumber.trim() || null,
      emergency_contact_relationship: ecRel || null,
      treatment_interests: interestList.length ? interestList : null,
      photo_consent: photoConsent,
      marketing_consent: marketingConsent,
      notes: notes.trim() || null,
      allergies: allergyArray,
    };
    for (const c of MEDICAL) {
      const m = medical[c.key];
      payload[`medical_${c.key}`] = m.value;
      payload[`medical_${c.key}_details`] = m.value ? (m.details.trim() || null) : null;
    }

    setSaving(true);
    try {
      await onCreate(payload);
      toast({ title: "Patient registered", description: `${fullName.trim()} added to the clinic register.` });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Could not register patient", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="patient-registration-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Register patient</DialogTitle>
          <DialogDescription>Full clinic intake — identity, medical screening, emergency contact &amp; consent.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Identity */}
          <section className="space-y-3">
            <div className="text-sm font-semibold flex items-center gap-2"><IdCard className="h-4 w-4" /> Identity</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Full name *</Label>
                <Input data-testid="reg-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Aisha Al Maktoum" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date of birth</Label>
                <Input type="date" data-testid="reg-dob" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gender</Label>
                <select className={selectClass} data-testid="reg-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="female">female</option>
                  <option value="male">male</option>
                  <option value="other">other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone *</Label>
                <Input data-testid="reg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9715XXXXXXXX" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" data-testid="reg-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@email.com" />
              </div>
            </div>
          </section>

          {/* Nationality & residence */}
          <section className="space-y-3 border-t pt-4">
            <div className="text-sm font-semibold">Nationality &amp; residence</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nationality</Label>
                <Input data-testid="reg-nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="e.g. Emirati" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Country of residence</Label>
                <Input data-testid="reg-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. United Arab Emirates" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Emirate</Label>
                <select className={selectClass} data-testid="reg-emirate" value={emirate} onChange={(e) => setEmirate(e.target.value)}>
                  <option value="">— select —</option>
                  {UAE_EMIRATES.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Emirates ID</Label>
                <Input data-testid="reg-emirates-id" value={emiratesId} onChange={(e) => setEmiratesId(e.target.value)} placeholder="784-XXXX-XXXXXXX-X" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Address</Label>
                <Input data-testid="reg-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Building / street / area" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">File number</Label>
                <Input data-testid="reg-file-number" value={fileNumber} onChange={(e) => setFileNumber(e.target.value)} placeholder="clinic file #" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preferred language</Label>
                <select className={selectClass} data-testid="reg-language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="en">English</option>
                  <option value="ar">العربية (Arabic)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Skin profile */}
          <section className="space-y-3 border-t pt-4">
            <div className="text-sm font-semibold">Skin profile</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Skin type</Label>
                <select className={selectClass} data-testid="reg-skin-type" value={skinType} onChange={(e) => setSkinType(e.target.value)}>
                  <option value="">— select —</option>
                  {["normal", "oily", "dry", "combination", "sensitive"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fitzpatrick type</Label>
                <select className={selectClass} data-testid="reg-fitzpatrick" value={fitz} onChange={(e) => setFitz(e.target.value)}>
                  <option value="">— select —</option>
                  {FITZPATRICK.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Medical history declaration — structured screening (source of truth) */}
          <section className="space-y-3 border-t pt-4">
            <div className="text-sm font-semibold flex items-center gap-2"><HeartPulse className="h-4 w-4" /> Medical history declaration</div>
            <div className="space-y-3">
              {MEDICAL.map((c) => (
                <div key={c.key} className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      data-testid={`reg-medical-${c.key}`}
                      checked={medical[c.key].value}
                      onCheckedChange={(v) => setMed(c.key, { value: !!v })}
                    />
                    <span>{c.label}</span>
                  </label>
                  {medical[c.key].value && (
                    <Textarea
                      data-testid={`reg-medical-${c.key}-details`}
                      rows={2}
                      value={medical[c.key].details}
                      onChange={(e) => setMed(c.key, { details: e.target.value })}
                      placeholder="Please provide details…"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Emergency contact */}
          <section className="space-y-3 border-t pt-4">
            <div className="text-sm font-semibold flex items-center gap-2"><Phone className="h-4 w-4" /> Emergency contact</div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input data-testid="reg-ec-name" value={ecName} onChange={(e) => setEcName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Number</Label>
                <Input data-testid="reg-ec-number" value={ecNumber} onChange={(e) => setEcNumber(e.target.value)} placeholder="+9715XXXXXXXX" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Relationship</Label>
                <select className={selectClass} data-testid="reg-ec-rel" value={ecRel} onChange={(e) => setEcRel(e.target.value)}>
                  <option value="">— select —</option>
                  {["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Interests & consent */}
          <section className="space-y-3 border-t pt-4">
            <div className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Interests &amp; consent</div>
            <div className="space-y-1.5">
              <Label className="text-xs">Treatment interests <span className="text-muted-foreground">(comma-separated)</span></Label>
              <Input data-testid="reg-interests" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g. Botox, fillers, laser" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox data-testid="reg-photo-consent" checked={photoConsent} onCheckedChange={(v) => setPhotoConsent(!!v)} />
                <span>Consents to clinical / before-after photography</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox data-testid="reg-marketing-consent" checked={marketingConsent} onCheckedChange={(v) => setMarketingConsent(!!v)} />
                <span>Consents to marketing communications</span>
              </label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea data-testid="reg-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any other intake notes…" />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} data-testid="reg-submit">
            <UserPlus className="h-4 w-4 mr-1" /> {saving ? "Registering…" : "Register patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
