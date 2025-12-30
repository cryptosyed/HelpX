import client from "./client";

type MatchProvidersParams = {
  global_service_id?: number;
  user_lat?: number;
  user_lon?: number;
  radius_km?: number;
};

type BookingPayload = {
  service_id?: number | null;
  global_service_id?: number | null;
  provider_id?: number | null;
  scheduled_at: string;
  notes?: string | null;
  user_address?: string | null;
  user_lat?: number | null;
  user_lon?: number | null;
};

export async function matchProviders(params: MatchProvidersParams) {
  const res = await client.get("/match/providers", { params });
  return res.data;
}

export async function createBooking(payload: BookingPayload) {
  const res = await client.post("/bookings", payload);
  return res.data;
}

export async function getUserBookings() {
  const res = await client.get("/bookings");
  return res.data;
}

export async function getProviderBookings() {
  const res = await client.get("/bookings/provider");
  return res.data;
}

export async function acceptBooking(id: number) {
  const res = await client.put(`/bookings/${id}/accept`);
  return res.data;
}

export async function cancelBookingUser(id: number, reason?: string) {
  const res = await client.put(`/bookings/${id}/cancel`, { reason });
  return res.data;
}

export async function cancelBookingProvider(id: number, reason?: string) {
  const res = await client.put(`/bookings/${id}/cancel/provider`, { reason });
  return res.data;
}

export async function completeBooking(id: number) {
  const res = await client.put(`/bookings/${id}/complete`);
  return res.data;
}

