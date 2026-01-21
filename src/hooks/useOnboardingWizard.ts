// ============================================
// useOnboardingSession
// Manages the onboarding session state
// ============================================
export function useOnboardingSession() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load or create session
  const loadSession = useCallback(async () => {
    // CRITICAL: Wait for tenantId
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to get existing session
      const { data, error: fetchError } = await supabase
        .from("onboarding_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle instead of single

      if (fetchError) {
        console.error("Error fetching session:", fetchError);
        throw fetchError;
      }

      if (data) {
        setSession(data as OnboardingSession);
      } else {
        // Create new session with ALL required fields
        const newSessionData = {
          tenant_id: tenantId,
          current_step: 1,
          steps_completed: [],
          completion_percentage: 0,
          input_type: "website",
          primary_input: "",
          secondary_inputs: [],
          uploaded_documents: [],
          scraped_data: {},
          extraction_status: "pending",
          extraction_error: null,
          ai_analysis: {},
          confidence_scores: {},
          client_modifications: {},
          started_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        };

        const { data: newSession, error: createError } = await supabase
          .from("onboarding_sessions")
          .insert(newSessionData)
          .select()
          .single();

        if (createError) {
          console.error("Error creating session:", createError);
          throw createError;
        }

        setSession(newSession as OnboardingSession);
      }
    } catch (err: any) {
      console.error("Session error:", err);
      setError(err.message);
      // Don't show toast on initial load - just set error state
      if (session) {
        toast({
          title: "Error loading session",
          description: err.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast, session]);

  // ... rest of the hook stays the same
}
