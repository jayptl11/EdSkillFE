import { apiDelete, apiGet, apiPatch, apiPost } from '../../api/client'
import type {
  CompanionSpaceCardDto,
  CreateCompanionSpaceCardRequest,
  CreateLearnerSpaceCardRequest,
  GenerateMySpaceUploadUrlRequest,
  LearnerSpaceCardDto,
  MySpaceDto,
  MySpaceUploadUrlDto,
  UpdateCompanionSpaceCardRequest,
  UpdateLearnerSpaceCardRequest,
} from './types'

export const mySpaceKeys = {
  me: () => ['my-space', 'me'] as const,
}

export const mySpaceApi = {
  getMySpace: () => apiGet<MySpaceDto>('/api/my-space', { auth: true }),

  createCompanionCard: (payload: CreateCompanionSpaceCardRequest) =>
    apiPost<CompanionSpaceCardDto>('/api/my-space/companion-cards', payload, { auth: true }),

  updateCompanionCard: (cardId: string, payload: UpdateCompanionSpaceCardRequest) =>
    apiPatch<CompanionSpaceCardDto>(`/api/my-space/companion-cards/${cardId}`, payload, {
      auth: true,
    }),

  deleteCompanionCard: (cardId: string) =>
    apiDelete(`/api/my-space/companion-cards/${cardId}`, { auth: true }),

  createLearnerCard: (payload: CreateLearnerSpaceCardRequest) =>
    apiPost<LearnerSpaceCardDto>('/api/my-space/learner-cards', payload, { auth: true }),

  updateLearnerCard: (cardId: string, payload: UpdateLearnerSpaceCardRequest) =>
    apiPatch<LearnerSpaceCardDto>(`/api/my-space/learner-cards/${cardId}`, payload, {
      auth: true,
    }),

  deleteLearnerCard: (cardId: string) =>
    apiDelete(`/api/my-space/learner-cards/${cardId}`, { auth: true }),

  createCoverUploadUrl: (payload: GenerateMySpaceUploadUrlRequest) =>
    apiPost<MySpaceUploadUrlDto>('/api/my-space/cover-upload-url', payload, { auth: true }),

  createCredentialUploadUrl: (payload: GenerateMySpaceUploadUrlRequest) =>
    apiPost<MySpaceUploadUrlDto>('/api/my-space/credential-upload-url', payload, {
      auth: true,
    }),
}

