import type { FastifyRequest } from "fastify";
import { RunnerRequestError } from "./runner.js";

export function requestIp(request: FastifyRequest): string {
  return request.ip || "unknown";
}

export function operationFailureMessage(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "Quá thời gian chờ Deployment Runner phản hồi.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Deployment Runner không thể hoàn tất thao tác.";
}

export function observationFailure(error: unknown): { statusCode: number; code: string; message: string } {
  if (error instanceof RunnerRequestError) {
    if ([400, 404, 409, 413, 422, 503].includes(error.statusCode)) {
      return { statusCode: error.statusCode, code: error.code, message: error.message };
    }
    return { statusCode: 502, code: "runner_unavailable", message: "Không thể đọc dữ liệu quan sát từ Deployment Runner." };
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return { statusCode: 504, code: "runner_timeout", message: "Quá thời gian chờ dữ liệu quan sát." };
  }
  return { statusCode: 502, code: "runner_unavailable", message: "Không thể đọc dữ liệu quan sát từ Deployment Runner." };
}

export function runnerMutationFailure(error: unknown): { statusCode: number; code: string; message: string } {
  if (error instanceof RunnerRequestError) {
    if ([400, 404, 409, 413, 422, 503].includes(error.statusCode)) {
      return { statusCode: error.statusCode, code: error.code, message: error.message };
    }
    return { statusCode: 502, code: "runner_unavailable", message: "Deployment Runner không thể hoàn tất thao tác." };
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return { statusCode: 504, code: "runner_timeout", message: "Quá thời gian chờ Deployment Runner phản hồi." };
  }
  return { statusCode: 502, code: "runner_unavailable", message: "Deployment Runner không thể hoàn tất thao tác." };
}
