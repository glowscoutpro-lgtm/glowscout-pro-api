import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { searchPros, type SearchResponse } from "./src/api";
import {
  getProfessionOption,
  getServiceOptionsForCategory,
  PREFERENCE_OPTIONS,
  PROFESSION_OPTIONS,
  SERVICE_OPTIONS
} from "./src/services";
import type { ProResult, ServiceCategory, ServiceSlug, SurveyPayload } from "./src/types";

const budgetOptions: Array<{ label: string; value: SurveyPayload["budget"] }> = [
  { label: "Under $50", value: "under-50" },
  { label: "$50-$85", value: "50-85" },
  { label: "$85-$125", value: "85-125" },
  { label: "$125+", value: "125-plus" }
];

const availabilityOptions: Array<{ label: string; value: SurveyPayload["availability"] }> = [
  { label: "Today", value: "today" },
  { label: "This week", value: "this-week" },
  { label: "Weekend", value: "weekend" },
  { label: "Flexible", value: "flexible" }
];

function licenseBadgeColors(status: ProResult["licenseVerification"]["status"]) {
  if (status === "state_verified") {
    return { backgroundColor: "#DDEDEA", borderColor: "#437A22", color: "#244614" };
  }

  if (status === "license_found") {
    return { backgroundColor: "#FFF0D8", borderColor: "#DA7101", color: "#6E3A00" };
  }

  if (status === "pending_review") {
    return { backgroundColor: "#E9EEF8", borderColor: "#006494", color: "#173F58" };
  }

  return { backgroundColor: "#F3F0EC", borderColor: "#D4D1CA", color: "#5F5D58" };
}

type LocationSuggestion = {
  city: string;
  state: string;
  zip?: string;
  region?: string;
};

const LOCATION_SUGGESTIONS: LocationSuggestion[] = [
  { city: "Lake Zurich", state: "IL", zip: "60047", region: "Chicago northwest suburbs" },
  { city: "Long Grove", state: "IL", zip: "60047", region: "Chicago northwest suburbs" },
  { city: "Hawthorn Woods", state: "IL", zip: "60047", region: "Chicago northwest suburbs" },
  { city: "Barrington", state: "IL", zip: "60010", region: "Chicago northwest suburbs" },
  { city: "Deer Park", state: "IL", zip: "60010", region: "Chicago northwest suburbs" },
  { city: "Kildeer", state: "IL", zip: "60047", region: "Chicago northwest suburbs" },
  { city: "Austin", state: "TX", zip: "78701", region: "Central Texas" },
  { city: "Chicago", state: "IL", zip: "60611", region: "Chicago metro" },
  { city: "Naperville", state: "IL", zip: "60540", region: "Chicago west suburbs" },
  { city: "Schaumburg", state: "IL", zip: "60173", region: "Chicago northwest suburbs" },
  { city: "Miami", state: "FL", zip: "33130", region: "South Florida" },
  { city: "New York", state: "NY", zip: "10001", region: "New York City" },
  { city: "Los Angeles", state: "CA", zip: "90012", region: "Southern California" }
];

export default function App() {
  const [location, setLocation] = useState("");
  const [locationSuggestionsOpen, setLocationSuggestionsOpen] = useState(false);
  const [category, setCategory] = useState<ServiceCategory>("nails");
  const [professionMenuOpen, setProfessionMenuOpen] = useState(false);
  const [services, setServices] = useState<ServiceSlug[]>(["gel-manicure"]);
  const [budget, setBudget] = useState<SurveyPayload["budget"]>("50-85");
  const [availability, setAvailability] = useState<SurveyPayload["availability"]>("this-week");
  const [maxDistanceMiles, setMaxDistanceMiles] = useState("10");
  const [preferences, setPreferences] = useState<string[]>(["Can book online"]);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewPro, setReviewPro] = useState<ProResult | null>(null);

  const selectedProfession = useMemo(() => getProfessionOption(category), [category]);
  const visibleServiceOptions = useMemo(() => getServiceOptionsForCategory(category), [category]);
  const selectedServicesLabel = useMemo(
    () =>
      SERVICE_OPTIONS.filter((option) => services.includes(option.slug))
        .map((option) => option.label)
        .join(", "),
    [services]
  );
  const licensedProSelected = preferences.includes("Licensed pro");

  const locationMatches = useMemo(() => {
    const query = location.trim().toLowerCase();

    if (query.length < 2) {
      return [];
    }

    return LOCATION_SUGGESTIONS.filter((suggestion) => {
      const searchable = [
        suggestion.city,
        suggestion.state,
        suggestion.zip,
        `${suggestion.city}, ${suggestion.state}`,
        suggestion.region
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    }).slice(0, 5);
  }, [location]);

  function toggleService(slug: ServiceSlug) {
    setServices((current) =>
      current.includes(slug) ? current.filter((service) => service !== slug) : [...current, slug]
    );
  }

  function togglePreference(preference: string) {
    setPreferences((current) =>
      current.includes(preference)
        ? current.filter((item) => item !== preference)
        : [...current, preference]
    );
  }

  function selectProfession(nextCategory: ServiceCategory) {
    const profession = getProfessionOption(nextCategory);
    setCategory(nextCategory);
    setServices(profession.defaultServices);
    setProfessionMenuOpen(false);
  }

  function toggleLicensedPro() {
    togglePreference("Licensed pro");
  }

  function updateLocation(value: string) {
    setLocation(value);
    setLocationSuggestionsOpen(true);
  }

  function selectLocationSuggestion(suggestion: LocationSuggestion) {
    setLocation(`${suggestion.city}, ${suggestion.state}${suggestion.zip ? ` ${suggestion.zip}` : ""}`);
    setLocationSuggestionsOpen(false);
  }

  async function onSearch() {
    if (location.trim().length < 2) {
      Alert.alert("Add a location", "Enter a zip code, town, or city to find nearby pros.");
      return;
    }

    if (services.length === 0) {
      Alert.alert("Choose a service", `Select at least one ${selectedProfession.shortLabel.toLowerCase()} service.`);
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const response = await searchPros({
        location: location.trim(),
        category,
        services,
        budget,
        availability,
        maxDistanceMiles: Number(maxDistanceMiles) || 10,
        preferences
      });
      setResults(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Search failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Feather name="search" size={24} color="#F7F6F2" />
          </View>
          <Text style={styles.kicker}>GlowScout</Text>
          <Text style={styles.title}>Find top-rated beauty and wellness pros near you.</Text>
          <Text style={styles.subtitle}>
            Search by zip code, town, or city. GlowScout only shows pros with 10+ Google reviews and
            4.5+ stars.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Where should we scout?</Text>
          <View style={styles.locationField}>
            <TextInput
              value={location}
              onChangeText={updateLocation}
              onFocus={() => setLocationSuggestionsOpen(true)}
              placeholder="Zip code, town, or city"
              placeholderTextColor="#7A7974"
              autoCapitalize="words"
              style={styles.input}
            />
            {locationSuggestionsOpen && locationMatches.length > 0 && (
              <View style={styles.locationDropdown}>
                {locationMatches.map((suggestion) => (
                  <Pressable
                    key={`${suggestion.city}-${suggestion.state}-${suggestion.zip}`}
                    onPress={() => selectLocationSuggestion(suggestion)}
                    style={styles.locationSuggestion}
                  >
                    <Text style={styles.locationSuggestionTitle}>
                      {suggestion.city}, {suggestion.state}
                    </Text>
                    <Text style={styles.locationSuggestionMeta}>
                      {suggestion.zip ? `${suggestion.zip} · ` : ""}
                      {suggestion.region}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Choose a profession</Text>
          <View style={styles.dropdownWrap}>
            <Pressable
              onPress={() => setProfessionMenuOpen((open) => !open)}
              style={styles.dropdownButton}
              accessibilityRole="button"
              accessibilityLabel="Choose beauty or wellness profession"
            >
              <View>
                <Text style={styles.dropdownLabel}>{selectedProfession.label}</Text>
                <Text style={styles.dropdownHint}>{selectedProfession.searchHint}</Text>
              </View>
              <Feather name={professionMenuOpen ? "chevron-up" : "chevron-down"} size={20} color="#01696F" />
            </Pressable>
            {professionMenuOpen && (
              <View style={styles.professionMenu}>
                {PROFESSION_OPTIONS.map((profession) => (
                  <Pressable
                    key={profession.category}
                    onPress={() => selectProfession(profession.category)}
                    style={[
                      styles.professionOption,
                      profession.category === category && styles.professionOptionSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.professionOptionLabel,
                        profession.category === category && styles.chipTextSelected
                      ]}
                    >
                      {profession.label}
                    </Text>
                    <Text style={styles.professionOptionHint}>{profession.searchHint}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>What service are you looking for?</Text>
          <View style={styles.optionGrid}>
            {visibleServiceOptions.map((option) => {
              const selected = services.includes(option.slug);
              return (
                <Pressable
                  key={option.slug}
                  onPress={() => toggleService(option.slug)}
                  style={[styles.serviceCard, selected && styles.serviceCardSelected]}
                >
                  <Text style={[styles.serviceLabel, selected && styles.selectedText]}>{option.label}</Text>
                  <Text style={[styles.serviceDescription, selected && styles.selectedMuted]}>
                    {option.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Budget</Text>
          <View style={styles.chipRow}>
            {budgetOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={budget === option.value}
                onPress={() => setBudget(option.value)}
              />
            ))}
          </View>

          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.chipRow}>
            {availabilityOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={availability === option.value}
                onPress={() => setAvailability(option.value)}
              />
            ))}
          </View>

          <Text style={styles.sectionTitle}>Travel radius</Text>
          <TextInput
            value={maxDistanceMiles}
            onChangeText={setMaxDistanceMiles}
            keyboardType="number-pad"
            style={styles.input}
          />

          <Text style={styles.sectionTitle}>Preferences</Text>
          <Pressable
            onPress={toggleLicensedPro}
            style={[styles.licensedButton, licensedProSelected && styles.licensedButtonSelected]}
          >
            <Feather
              name={licensedProSelected ? "check-circle" : "shield"}
              size={18}
              color={licensedProSelected ? "#F7F6F2" : "#01696F"}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.licensedTitle, licensedProSelected && styles.selectedText]}>Licensed pro</Text>
              <Text style={[styles.licensedHint, licensedProSelected && styles.selectedMuted]}>
                Prioritize pros who present as licensed or credentialed.
              </Text>
            </View>
          </Pressable>
          <View style={styles.chipRow}>
            {PREFERENCE_OPTIONS.map((preference) => (
              <Chip
                key={preference}
                label={preference}
                selected={preferences.includes(preference)}
                onPress={() => togglePreference(preference)}
              />
            ))}
          </View>

          <Pressable onPress={onSearch} style={styles.primaryButton} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#F7F6F2" />
            ) : (
              <Text style={styles.primaryButtonText}>Find verified pros</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your survey</Text>
          <Text style={styles.summaryText}>
            Looking for {selectedServicesLabel || selectedProfession.label.toLowerCase()} near{" "}
            {location || "your area"}.
          </Text>
          <Text style={styles.summaryText}>
            Filters: 4.5+ stars, 10+ reviews, budget {budget?.replace("-", " ")}, {availability}.
          </Text>
        </View>

        {results && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {results.pros.length} matching {results.mode === "demo" ? "demo" : "live"} pros
            </Text>
            <Text style={styles.resultsSubtitle}>
              Ranked by rating strength and review count. Cost ranges are estimates until the pro confirms
              pricing.
            </Text>

            {results.pros.map((pro) => (
              <View key={pro.id} style={styles.proCard}>
                <View style={styles.proHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.proName}>{pro.name}</Text>
                    <Text style={styles.proAddress}>{pro.address}</Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{pro.score}</Text>
                    <Text style={styles.scoreLabel}>match</Text>
                  </View>
                </View>

                <View style={styles.ratingRow}>
                  <Feather name="star" size={16} color="#DA7101" />
                  <Text style={styles.ratingText}>
                    {pro.rating.toFixed(1)} stars · {pro.reviewCount} Google reviews
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <View style={[styles.trustBadge, styles.googleBadge]}>
                    <Feather name="check-circle" size={13} color="#01696F" />
                    <Text style={styles.googleBadgeText}>Top-rated</Text>
                  </View>
                  <View
                    style={[
                      styles.trustBadge,
                      {
                        backgroundColor: licenseBadgeColors(pro.licenseVerification.status).backgroundColor,
                        borderColor: licenseBadgeColors(pro.licenseVerification.status).borderColor
                      }
                    ]}
                  >
                    <Feather
                      name={pro.licenseVerification.status === "state_verified" ? "shield" : "alert-circle"}
                      size={13}
                      color={licenseBadgeColors(pro.licenseVerification.status).color}
                    />
                    <Text
                      style={[
                        styles.licenseBadgeText,
                        { color: licenseBadgeColors(pro.licenseVerification.status).color }
                      ]}
                    >
                      {pro.licenseVerification.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.licenseDetail}>{pro.licenseVerification.detail}</Text>

                {pro.estimatedCosts.length > 0 && (
                  <View style={styles.costBox}>
                    <Text style={styles.costTitle}>Estimated service costs</Text>
                    {pro.estimatedCosts.map((cost) => (
                      <Text key={`${pro.id}-${cost.service}`} style={styles.costText}>
                        {cost.label}: ${cost.low}-${cost.high}
                      </Text>
                    ))}
                  </View>
                )}

                {pro.reviewHighlights.length > 0 && (
                  <View style={styles.highlights}>
                    {pro.reviewHighlights.map((highlight, index) => (
                      <Text key={`${pro.id}-highlight-${index}`} style={styles.highlightText}>
                        “{highlight}”
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.actionRow}>
                  {pro.phone && <SmallButton label="Call" onPress={() => Linking.openURL(`tel:${pro.phone}`)} />}
                  {pro.website && <SmallButton label="Website" onPress={() => Linking.openURL(pro.website!)} />}
                  {pro.googleMapsUri && (
                    <SmallButton label="Map" onPress={() => Linking.openURL(pro.googleMapsUri!)} />
                  )}
                  <SmallButton label="View reviews" onPress={() => setReviewPro(pro)} />
                </View>
              </View>
            ))}
          </View>
        )}

        <Modal visible={Boolean(reviewPro)} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.summaryTitle}>Google reviews</Text>
                  <Text style={styles.summaryText}>{reviewPro?.name}</Text>
                </View>
                <Pressable onPress={() => setReviewPro(null)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </View>

              {reviewPro?.reviews?.length ? (
                reviewPro.reviews.slice(0, 5).map((review, index) => (
                  <View key={`${reviewPro.id}-review-${index}`} style={styles.reviewCard}>
                    <Text style={styles.reviewAuthor}>
                      {review.authorName} {review.rating ? `· ${review.rating} stars` : ""}
                    </Text>
                    {review.relativePublishTime && (
                      <Text style={styles.reviewMeta}>{review.relativePublishTime}</Text>
                    )}
                    <Text style={styles.reviewBody}>{review.text}</Text>
                    {review.authorUri && (
                      <Pressable onPress={() => Linking.openURL(review.authorUri!)}>
                        <Text style={styles.reviewLink}>View Google reviewer profile</Text>
                      </Pressable>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewAuthor}>No written reviews returned</Text>
                  <Text style={styles.reviewBody}>
                    This pro meets the rating and review-count threshold, but Google did not return written
                    review excerpts for this search.
                  </Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.smallButton}>
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F6F2"
  },
  container: {
    padding: 20,
    paddingBottom: 48
  },
  hero: {
    paddingVertical: 20
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#01696F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18
  },
  kicker: {
    color: "#01696F",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 8
  },
  title: {
    color: "#28251D",
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 46,
    marginBottom: 12
  },
  subtitle: {
    color: "#5F5D58",
    fontSize: 17,
    lineHeight: 25
  },
  card: {
    backgroundColor: "#FBFBF9",
    borderRadius: 28,
    padding: 18,
    borderColor: "#D4D1CA",
    borderWidth: 1
  },
  sectionTitle: {
    color: "#28251D",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 18
  },
  input: {
    borderColor: "#D4D1CA",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#28251D",
    backgroundColor: "#F9F8F5"
  },
  locationField: {
    position: "relative",
    zIndex: 5
  },
  locationDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#D4D1CA",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FBFBF9"
  },
  locationSuggestion: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ECE9E2"
  },
  locationSuggestionTitle: {
    color: "#28251D",
    fontSize: 15,
    fontWeight: "900"
  },
  locationSuggestionMeta: {
    color: "#7A7974",
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18
  },
  dropdownWrap: {
    position: "relative",
    zIndex: 4
  },
  dropdownButton: {
    borderColor: "#D4D1CA",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F9F8F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14
  },
  dropdownLabel: {
    color: "#28251D",
    fontWeight: "900",
    fontSize: 16
  },
  dropdownHint: {
    color: "#7A7974",
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18
  },
  professionMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#D4D1CA",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FBFBF9"
  },
  professionOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ECE9E2"
  },
  professionOptionSelected: {
    backgroundColor: "#DDEDEE"
  },
  professionOptionLabel: {
    color: "#28251D",
    fontWeight: "900",
    fontSize: 15
  },
  professionOptionHint: {
    color: "#7A7974",
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18
  },
  optionGrid: {
    gap: 10
  },
  serviceCard: {
    borderWidth: 1,
    borderColor: "#D4D1CA",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#F9F8F5"
  },
  serviceCardSelected: {
    borderColor: "#01696F",
    backgroundColor: "#01696F"
  },
  serviceLabel: {
    color: "#28251D",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 4
  },
  serviceDescription: {
    color: "#7A7974",
    fontSize: 14,
    lineHeight: 20
  },
  selectedText: {
    color: "#F7F6F2"
  },
  selectedMuted: {
    color: "#DDEDEE"
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    borderWidth: 1,
    borderColor: "#D4D1CA",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#F9F8F5"
  },
  chipSelected: {
    backgroundColor: "#DDEDEE",
    borderColor: "#01696F"
  },
  chipText: {
    color: "#28251D",
    fontWeight: "700"
  },
  chipTextSelected: {
    color: "#01696F"
  },
  licensedButton: {
    borderWidth: 1,
    borderColor: "#01696F",
    borderRadius: 18,
    backgroundColor: "#F9F8F5",
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  licensedButtonSelected: {
    backgroundColor: "#01696F"
  },
  licensedTitle: {
    color: "#28251D",
    fontWeight: "900",
    fontSize: 15
  },
  licensedHint: {
    color: "#7A7974",
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18
  },
  primaryButton: {
    backgroundColor: "#01696F",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24
  },
  primaryButtonText: {
    color: "#F7F6F2",
    fontWeight: "900",
    fontSize: 16
  },
  summaryCard: {
    marginTop: 18,
    backgroundColor: "#F9F8F5",
    borderColor: "#D4D1CA",
    borderWidth: 1,
    borderRadius: 22,
    padding: 16
  },
  summaryTitle: {
    fontSize: 16,
    color: "#28251D",
    fontWeight: "900",
    marginBottom: 6
  },
  summaryText: {
    color: "#5F5D58",
    lineHeight: 22
  },
  resultsSection: {
    marginTop: 26
  },
  resultsTitle: {
    color: "#28251D",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6
  },
  resultsSubtitle: {
    color: "#5F5D58",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14
  },
  proCard: {
    backgroundColor: "#FBFBF9",
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#D4D1CA"
  },
  proHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  proName: {
    color: "#28251D",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4
  },
  proAddress: {
    color: "#7A7974",
    lineHeight: 20
  },
  scoreBadge: {
    backgroundColor: "#DDEDEE",
    borderRadius: 16,
    padding: 10,
    minWidth: 62,
    alignItems: "center"
  },
  scoreText: {
    color: "#01696F",
    fontWeight: "900",
    fontSize: 20
  },
  scoreLabel: {
    color: "#01696F",
    fontSize: 11,
    fontWeight: "800"
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12
  },
  ratingText: {
    color: "#28251D",
    fontWeight: "800"
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  trustBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  googleBadge: {
    backgroundColor: "#DDEDEE",
    borderColor: "#01696F"
  },
  googleBadgeText: {
    color: "#01696F",
    fontSize: 12,
    fontWeight: "900"
  },
  licenseBadgeText: {
    fontSize: 12,
    fontWeight: "900"
  },
  licenseDetail: {
    color: "#7A7974",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8
  },
  costBox: {
    marginTop: 14,
    backgroundColor: "#F7F6F2",
    borderRadius: 16,
    padding: 12
  },
  costTitle: {
    color: "#28251D",
    fontWeight: "900",
    marginBottom: 6
  },
  costText: {
    color: "#5F5D58",
    lineHeight: 22
  },
  highlights: {
    marginTop: 12,
    gap: 8
  },
  highlightText: {
    color: "#5F5D58",
    fontSize: 14,
    lineHeight: 20
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14
  },
  smallButton: {
    borderRadius: 999,
    backgroundColor: "#28251D",
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  smallButtonText: {
    color: "#F7F6F2",
    fontWeight: "800"
  },
  modalContent: {
    padding: 20,
    paddingBottom: 48
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 18
  },
  closeButton: {
    borderRadius: 999,
    backgroundColor: "#01696F",
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  closeButtonText: {
    color: "#F7F6F2",
    fontWeight: "900"
  },
  reviewCard: {
    backgroundColor: "#FBFBF9",
    borderColor: "#D4D1CA",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12
  },
  reviewAuthor: {
    color: "#28251D",
    fontWeight: "900",
    fontSize: 16
  },
  reviewMeta: {
    color: "#7A7974",
    marginTop: 2,
    marginBottom: 8
  },
  reviewBody: {
    color: "#5F5D58",
    lineHeight: 22
  },
  reviewLink: {
    color: "#01696F",
    fontWeight: "900",
    marginTop: 10
  }
});
