import { describe, expect, it, vi, beforeEach } from "vitest";
import app from "@/app";
import { getAuth } from "@/lib/auth";

// Mock the modules
vi.mock("@/lib/auth");
vi.mock("@/services/trip-service");

// Helper function for mocking authentication
function mockAuth(user: { id: string; email: string } | null) {
  const mockAuthInstance = {
    handleAuth: vi.fn(),
    getSession: vi.fn().mockResolvedValue(user ? { user } : null)
  };
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (getAuth as any).mockReturnValue(mockAuthInstance);
  return mockAuthInstance;
}

// Helper function for setting up app.get mocks
function setupAppGetMocks(
  user: { id: string; email: string } | null,
  tripService: Partial<Record<string, ReturnType<typeof vi.fn>>>,
  authInstance: ReturnType<typeof mockAuth>
) {
  app.get = vi.fn().mockImplementation((key) => {
    if (key === "user") return user;
    if (key === "tripService") return tripService;
    if (key === "roles") return defaultMockRoles;
    if (key === "auth") return authInstance;
    return undefined;
  });
}

const defaultMockRoles = [
  { id: "role-1", name: "Organizer" },
  { id: "role-2", name: "Participant" },
  { id: "role-3", name: "Viewer" }
];

describe("Trip Routes Authorization", () => {
  const tripId = "123e4567-e89b-12d3-a456-426614174000";
  const updateData = { name: "Updated Trip" };
  const createData = {
    name: "New Trip",
    destination: "New York",
    startDate: "2023-01-01T00:00:00Z",
    endDate: "2023-01-07T00:00:00Z"
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth(null);
    app.get = vi.fn().mockReturnValue(undefined);
  });

  describe("GET /trips", () => {
    it("should allow authenticated users to list trips", async () => {
      const mockUser = { id: "user-123", email: "user@example.com" };
      const mockAuthInstance = mockAuth(mockUser);

      const mockTrips = [{ id: "trip-1", name: "Trip 1" }];
      const mockTripService = {
        getUserTrips: vi.fn().mockResolvedValue(mockTrips)
      };

      setupAppGetMocks(mockUser, mockTripService, mockAuthInstance);

      const res = await app.request("/trips");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockTrips);
      expect(mockTripService.getUserTrips).toHaveBeenCalledWith(mockUser.id);
    });

    it("should deny unauthenticated users from listing trips", async () => {
      mockAuth(null);

      const res = await app.request("/trips");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /trips", () => {
    it("should allow authenticated users to create a trip", async () => {
      const mockUser = { id: "user-123", email: "user@example.com" };
      const mockAuthInstance = mockAuth(mockUser);

      const mockNewTrip = { id: "new-trip-id", ...createData };
      const mockTripService = {
        createTrip: vi.fn().mockResolvedValue(mockNewTrip)
      };

      setupAppGetMocks(mockUser, mockTripService, mockAuthInstance);

      const res = await app.request("/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData)
      });

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual(mockNewTrip);
      expect(mockTripService.createTrip).toHaveBeenCalledWith(
        createData,
        mockUser.id
      );
    });

    it("should deny unauthenticated users from creating a trip", async () => {
      mockAuth(null);

      const res = await app.request("/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData)
      });

      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /trips/:tripId", () => {
    it("should allow organizers to update a trip", async () => {
      const mockUser = { id: "organizer-123", email: "organizer@example.com" };
      const mockAuthInstance = mockAuth(mockUser);

      const updatedTrip = { id: tripId, ...updateData };
      const mockTripService = {
        updateTrip: vi.fn().mockResolvedValue(updatedTrip)
      };

      setupAppGetMocks(mockUser, mockTripService, mockAuthInstance);

      const res = await app.request(`/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(updatedTrip);
      expect(mockTripService.updateTrip).toHaveBeenCalledWith(
        tripId,
        updateData
      );
    });

    it("should deny participants from updating a trip", async () => {
      const mockUser = {
        id: "participant-123",
        email: "participant@example.com"
      };
      const mockAuthInstance = mockAuth(mockUser);

      const mockTripService = {
        updateTrip: vi.fn().mockRejectedValue(new Error("Unauthorized"))
      };

      setupAppGetMocks(mockUser, mockTripService, mockAuthInstance);

      const res = await app.request(`/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      expect(res.status).toBe(403);
      expect(mockTripService.updateTrip).toHaveBeenCalledWith(
        tripId,
        updateData
      );
    });
  });

  describe("DELETE /trips/:tripId", () => {
    it("should allow organizers to delete a trip", async () => {
      const mockUser = { id: "organizer-123", email: "organizer@example.com" };
      const mockAuthInstance = mockAuth(mockUser);

      const mockTripService = {
        deleteTrip: vi.fn().mockResolvedValue(undefined)
      };

      setupAppGetMocks(mockUser, mockTripService, mockAuthInstance);

      const res = await app.request(`/trips/${tripId}`, {
        method: "DELETE"
      });

      expect(res.status).toBe(204);
      expect(mockTripService.deleteTrip).toHaveBeenCalledWith(tripId);
    });

    it("should deny participants from deleting a trip", async () => {
      const mockUser = {
        id: "participant-123",
        email: "participant@example.com"
      };
      const mockAuthInstance = mockAuth(mockUser);

      const mockTripService = {
        deleteTrip: vi.fn().mockRejectedValue(new Error("Unauthorized"))
      };

      setupAppGetMocks(mockUser, mockTripService, mockAuthInstance);

      const res = await app.request(`/trips/${tripId}`, {
        method: "DELETE"
      });

      expect(res.status).toBe(403);
      expect(mockTripService.deleteTrip).toHaveBeenCalledWith(tripId);
    });
  });

  describe("GET /trips/:tripId", () => {
    it("should allow organizers to view trip details", async () => {
      const mockUser = { id: "organizer-123", email: "organizer@example.com" };
      const mockAuthInstance = mockAuth(mockUser);

      const tripDetails = { id: tripId, name: "Trip Details" };
      const mockTripService = {
        getTripDetails: vi.fn().mockResolvedValue(tripDetails)
      };

      setupAppGetMocks(mockUser, mockTripService, mockAuthInstance);

      const res = await app.request(`/trips/${tripId}`);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(tripDetails);
      expect(mockTripService.getTripDetails).toHaveBeenCalledWith(tripId);
    });

    it("should allow participants to view trip details", async () => {
      const mockUser = {
        id: "participant-123",
        email: "participant@example.com"
      };
      const mockAuthInstance = mockAuth(mockUser);

      const tripDetails = { id: tripId, name: "Trip Details" };
      const mockTripService = {
        getTripDetails: vi.fn().mockResolvedValue(tripDetails)
      };

      setupAppGetMocks(mockUser, mockTripService, mockAuthInstance);

      const res = await app.request(`/trips/${tripId}`);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(tripDetails);
      expect(mockTripService.getTripDetails).toHaveBeenCalledWith(tripId);
    });

    it("should deny unauthorized users from viewing trip details", async () => {
      const mockUser = {
        id: "unauthorized-123",
        email: "unauthorized@example.com"
      };
      const mockAuthInstance = mockAuth(mockUser);

      const mockTripService = {
        getTripDetails: vi.fn().mockRejectedValue(new Error("Unauthorized"))
      };

      setupAppGetMocks(mockUser, mockTripService, mockAuthInstance);

      const res = await app.request(`/trips/${tripId}`);

      expect(res.status).toBe(403);
      expect(mockTripService.getTripDetails).toHaveBeenCalledWith(tripId);
    });
  });
});
