import type { DefaultPolarTypes } from "oso-cloud/dist/src/helpers";
import type {
  AuthorizeResult,
  Fact,
  IntoFact,
  IntoFactPattern,
  IntoValue,
  Value
} from "oso-cloud";
import type { FactChangeset } from "oso-cloud/dist/src/api";
import { paramToFact, toValue } from "oso-cloud/dist/src/helpers";

type AuthorizeArgs<F extends Fact, Q extends Fact> = Q extends [
  infer Allow,
  infer Actor extends Value,
  {
    type: infer String;
    id: infer Action;
  },
  infer Resource extends Value
]
  ? ["allow", "String"] extends [Allow, String]
    ? [IntoValue<Actor>, Action, IntoValue<Resource>, IntoFact<F>[]?]
    : never
  : never;

export class OsoClient<PT extends DefaultPolarTypes = DefaultPolarTypes> {
  private baseUrl: string;
  private authToken: string;

  constructor(url: string, apiKey: string) {
    this.baseUrl = url.endsWith("/") ? url : `${url}/`;
    this.authToken = apiKey;
  }

  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit
  ): Promise<Response> {
    const url = new URL(`api/${endpoint}`, this.baseUrl);
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${this.authToken}`);
    headers.set("Content-Type", "application/json");

    const response = await fetch(url.toString(), {
      ...options,
      headers
    });

    if (!response.ok) {
      const res = (await response.json()) as { message: string };
      console.error("Error in API request:");
      console.group();
      console.error(`URL: ${url.toString()}`);
      console.error(`Status: ${response.status}`);
      console.error(`Status Text: ${response.statusText}`);

      console.group("Request Body:");
      if (options?.body) {
        const bodyToPrint =
          typeof options.body === "string"
            ? JSON.parse(options.body)
            : options.body;
        console.error(JSON.stringify(bodyToPrint, null, 2));
      } else {
        console.error("No request body");
      }
      console.groupEnd();

      console.group("Response:");
      console.error(Object.keys(res));
      console.error(res.message);
      console.groupEnd();

      console.groupEnd();

      throw new Error(
        `HTTP error! status: ${response.status}, message: ${
          res.message || "Unknown error"
        }`
      );
    }

    return response;
  }

  async insert(fact: IntoFact<PT["fact"]>): Promise<void> {
    const fact_ = paramToFact(fact);
    await this.fetchWithAuth("batch", {
      method: "POST",
      body: JSON.stringify([{ inserts: [fact_] }])
    });
  }

  async delete(fact: IntoFactPattern<PT["fact"]>): Promise<void> {
    const fact_ = paramToFact(fact);
    await this.fetchWithAuth("batch", {
      method: "POST",
      body: JSON.stringify([{ deletes: [fact_] }])
    });
  }

  async batch(
    f: (tx: BatchTransaction<PT>) => void | Promise<void>
  ): Promise<void> {
    const txn = new BatchTransaction();
    await f(txn);
    if (txn.changes.length) {
      await this.fetchWithAuth("batch", {
        method: "POST",
        body: JSON.stringify(txn.changes)
      });
    }
  }

  async authorize(
    ...[actor, action, resource, _contextFacts]: AuthorizeArgs<
      PT["fact"],
      PT["query"]
    >
  ): Promise<boolean> {
    if (typeof action !== "string") {
      throw new TypeError(`'action' should be a string: ${action}`);
    }

    const { type: actor_type, id: actor_id } = toValue(actor);
    const { type: resource_type, id: resource_id } = toValue(resource);

    if (actor_type == null || actor_id == null) {
      throw new TypeError(`'actor' can not be a wildcard: ${actor}`);
    }
    if (resource_type == null || resource_id == null) {
      throw new TypeError(`'resource' can not be a wildcard: ${resource}`);
    }

    const response = await this.fetchWithAuth("authorize", {
      method: "POST",
      body: JSON.stringify({
        actor_type,
        actor_id,
        action,
        resource_type,
        resource_id
      })
    });

    const result = (await response.json()) as AuthorizeResult;
    return result.allowed;
  }
}

class BatchTransaction<PT extends DefaultPolarTypes> {
  changes: FactChangeset[];
  constructor() {
    this.changes = [];
  }

  insert(fact: IntoFact<PT["fact"]>): void {
    const fact_ = paramToFact(fact);
    let last = this.changes[this.changes.length - 1];
    if (last === undefined || !("inserts" in last)) {
      last = { inserts: [] };
      this.changes.push(last);
    }
    last.inserts.push(fact_);
  }

  delete(fact: IntoFactPattern<PT["fact"]>): void {
    const fact_ = paramToFact(fact);
    let last = this.changes[this.changes.length - 1];
    if (last === undefined || !("deletes" in last)) {
      last = { deletes: [] };
      this.changes.push(last);
    }
    last.deletes.push(fact_);
  }
}
