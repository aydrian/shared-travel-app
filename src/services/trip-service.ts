import { trips, tripRoles, roles } from "@/db/trips-schema.sql";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { DrizzleClient } from "@/lib/types";
import type { OsoClientType } from "@/lib/authz";

// Define interfaces for the return types
export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  ownerId: string;
  createdAt: Date;
}

export interface UserTrip extends Trip {
  roleId: string;
  roleName: string;
}

export interface TripWithRole extends Trip {
  userRole?: string;
}

export interface TripService {
  getUserTrips(userId: string): Promise<UserTrip[]>;
  createTrip(
    tripData: CreateTripData,
    userId: string,
    organizerRoleId: string
  ): Promise<Trip>;
  updateTrip(tripId: string, updateData: UpdateTripData): Promise<Trip>;
  deleteTrip(tripId: string): Promise<Trip>;
  getTripDetails(
    tripId: string,
    roles: Array<{ id: string; name: string }>
  ): Promise<TripWithRole>;
}

export interface CreateTripData {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export interface UpdateTripData {
  name?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
}

type TripQueryResult = {
  id: string;
  name: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  ownerId: string;
  createdAt: Date;
};

type TripWithRoleIdQueryResult = TripQueryResult & {
  roleId: string;
};

type UserTripQueryResult = TripWithRoleIdQueryResult & {
  roleName: string;
};

export class DefaultTripService implements TripService {
  constructor(private db: DrizzleClient, private oso: OsoClientType) {}

  /**
   * Maps a database query result to a Trip interface
   */
  private mapToTrip(result: TripQueryResult): Trip {
    return {
      id: result.id,
      name: result.name,
      destination: result.destination,
      startDate: result.startDate,
      endDate: result.endDate,
      ownerId: result.ownerId,
      createdAt: result.createdAt
    };
  }

  /**
   * Maps a database query result to a UserTrip interface
   */
  private mapToUserTrip(result: UserTripQueryResult): UserTrip {
    return {
      ...this.mapToTrip(result),
      roleId: result.roleId,
      roleName: result.roleName
    };
  }

  /**
   * Retrieves all trips associated with a specific user
   */
  async getUserTrips(userId: string): Promise<UserTrip[]> {
    try {
      const results = (await this.db
        .select({
          id: trips.id,
          name: trips.name,
          destination: trips.destination,
          startDate: trips.startDate,
          endDate: trips.endDate,
          ownerId: trips.ownerId,
          createdAt: trips.createdAt,
          roleId: tripRoles.roleId,
          roleName: roles.name
        })
        .from(tripRoles)
        .innerJoin(trips, eq(tripRoles.tripId, trips.id))
        .innerJoin(roles, eq(tripRoles.roleId, roles.id))
        .where(eq(tripRoles.userId, userId))) as UserTripQueryResult[];

      // Map the results to ensure they match the UserTrip interface
      return results.map((result) => this.mapToUserTrip(result));
    } catch (error) {
      console.error("Error fetching trips:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  /**
   * Creates a new trip and assigns the creator as an organizer
   */
  async createTrip(
    tripData: CreateTripData,
    userId: string,
    organizerRoleId: string
  ): Promise<Trip> {
    try {
      const { name, destination, startDate, endDate } = tripData;

      // Create new trip
      const [dbTrip] = (await this.db
        .insert(trips)
        .values({
          name,
          destination,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          ownerId: userId,
          createdAt: new Date()
        })
        .returning()) as TripQueryResult[];

      // Assign the user the "Organizer" role for this trip
      await this.db.insert(tripRoles).values({
        tripId: dbTrip.id,
        userId: userId,
        roleId: organizerRoleId
      });

      await this.oso.insert([
        "has_role",
        { type: "User", id: userId },
        { type: "String", id: "organizer" },
        { type: "Trip", id: dbTrip.id }
      ]);

      // Map the database result to our Trip interface
      return this.mapToTrip(dbTrip);
    } catch (error) {
      console.error("Error creating trip:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  /**
   * Updates an existing trip with new data
   */
  async updateTrip(tripId: string, updateData: UpdateTripData): Promise<Trip> {
    try {
      // Prepare an object for the database update
      const updateValues: Partial<typeof trips.$inferInsert> = {};

      // Convert date strings to Date objects if they exist
      if (updateData.name) updateValues.name = updateData.name;
      if (updateData.destination)
        updateValues.destination = updateData.destination;
      if (updateData.startDate)
        updateValues.startDate = new Date(updateData.startDate);
      if (updateData.endDate)
        updateValues.endDate = new Date(updateData.endDate);

      // Update the trip
      const [dbTrip] = (await this.db
        .update(trips)
        .set(updateValues)
        .where(eq(trips.id, tripId))
        .returning()) as TripQueryResult[];

      if (!dbTrip) {
        throw new HTTPException(404, {
          message: `Trip with ID ${tripId} not found`
        });
      }

      // Map the database result to our Trip interface
      return this.mapToTrip(dbTrip);
    } catch (error) {
      console.error("Error updating trip:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  /**
   * Deletes a trip by its ID
   */
  async deleteTrip(tripId: string): Promise<Trip> {
    try {
      // Delete the trip
      const deletedTrips = (await this.db
        .delete(trips)
        .where(eq(trips.id, tripId))
        .returning()) as TripQueryResult[];

      if (deletedTrips.length === 0) {
        throw new HTTPException(404, {
          message: `Trip with ID ${tripId} not found`
        });
      }

      // Remove trip facts from Oso
      await this.oso.delete([
        "has_role",
        null,
        null,
        { type: "Trip", id: tripId }
      ]);

      // Map the database result to our Trip interface
      return this.mapToTrip(deletedTrips[0]);
    } catch (error) {
      console.error("Error deleting trip:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }

  /**
   * Gets detailed information about a specific trip including user role
   */
  async getTripDetails(
    tripId: string,
    roles: Array<{ id: string; name: string }>
  ): Promise<TripWithRole> {
    try {
      const tripDetails = (await this.db
        .select({
          id: trips.id,
          name: trips.name,
          destination: trips.destination,
          startDate: trips.startDate,
          endDate: trips.endDate,
          ownerId: trips.ownerId,
          createdAt: trips.createdAt,
          roleId: tripRoles.roleId
        })
        .from(trips)
        .innerJoin(tripRoles, eq(trips.id, tripRoles.tripId))
        .where(eq(trips.id, tripId))
        .limit(1)) as TripWithRoleIdQueryResult[];

      if (tripDetails.length === 0) {
        throw new HTTPException(404, {
          message: `Trip with ID ${tripId} not found`
        });
      }

      // Get user role name from cached roles
      const userRole = roles.find((role) => role.id === tripDetails[0].roleId);

      // Create a properly typed return object
      return {
        ...this.mapToTrip(tripDetails[0]),
        userRole: userRole?.name
      };
    } catch (error) {
      console.error("Error fetching trip details:", error);
      throw new HTTPException(500, { message: "Internal Server Error" });
    }
  }
}
