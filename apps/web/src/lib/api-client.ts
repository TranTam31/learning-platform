import { contract } from "@repo/api-contract";
import { initClient } from "@ts-rest/core";
import { initQueryClient } from "@ts-rest/react-query";

/**
 * ts-rest React Query client cho Client Components.
 *
 * Sử dụng:
 *   const { data } = apiClient.health.check.useQuery(["health"]);
 */
export const apiClient = initQueryClient(contract, {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  baseHeaders: {},
});

/**
 * Plain ts-rest client cho Client Components — dùng khi cần gọi API
 * bên trong useTransition / useCallback / event handler (không dùng React Query hooks).
 *
 * Sử dụng:
 *   const { status, body } = await api.courses.createCourse({ body: { ... } });
 */
export const api = initClient(contract, {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  baseHeaders: {},
});
