import type { QueryClient } from '@tanstack/react-query'
import { achievementKeys } from '../features/achievements/achievementApi'
import { adminSessionWalletKeys } from '../features/admin-session-wallet/adminSessionWalletApi'
import { mySpaceKeys } from '../features/my-space/mySpaceApi'
import { profileKeys } from '../features/profile/profileApi'
import type { ProfileDto } from '../features/profile/types'
import { reviewDashboardKeys } from '../features/reviews/reviewDashboardApi'
import { companionKeys } from '../features/sessions/companionApi'
import { sessionKeys } from '../features/sessions/sessionsApi'
import { skillKeys } from '../features/skills/skillApi'
import { walletKeys } from '../features/wallet/walletApi'

export async function syncProfileCaches(queryClient: QueryClient, profile: ProfileDto) {
  queryClient.setQueryData(profileKeys.me(), profile)

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: profileKeys.user(profile.userId) }),
    queryClient.invalidateQueries({ queryKey: companionKeys.searchRoot() }),
    queryClient.invalidateQueries({ queryKey: companionKeys.publicProfiles() }),
    queryClient.invalidateQueries({ queryKey: companionKeys.skillDetails() }),
  ])
}

export async function invalidateWalletAndProfileQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: walletKeys.all() }),
    queryClient.invalidateQueries({ queryKey: profileKeys.me() }),
  ])
}

export async function invalidateSessionCompletionQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: achievementKeys.me() }),
    queryClient.invalidateQueries({ queryKey: companionKeys.searchRoot() }),
    queryClient.invalidateQueries({ queryKey: companionKeys.publicProfiles() }),
    queryClient.invalidateQueries({ queryKey: companionKeys.skillDetails() }),
    queryClient.invalidateQueries({ queryKey: mySpaceKeys.root() }),
    queryClient.invalidateQueries({ queryKey: profileKeys.me() }),
    queryClient.invalidateQueries({ queryKey: reviewDashboardKeys.root() }),
    queryClient.invalidateQueries({ queryKey: walletKeys.all() }),
  ])
}

export async function invalidateSkillCatalogQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: skillKeys.adminRoot() }),
    queryClient.invalidateQueries({ queryKey: skillKeys.searchRoot() }),
    queryClient.invalidateQueries({ queryKey: companionKeys.searchRoot() }),
    queryClient.invalidateQueries({ queryKey: companionKeys.publicProfiles() }),
    queryClient.invalidateQueries({ queryKey: companionKeys.skillDetails() }),
    queryClient.invalidateQueries({ queryKey: sessionKeys.all() }),
  ])
}

export async function invalidateAchievementAdminQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: achievementKeys.all() }),
    queryClient.invalidateQueries({ queryKey: companionKeys.publicProfiles() }),
    queryClient.invalidateQueries({ queryKey: profileKeys.users() }),
  ])
}

export async function invalidateAdminSessionWalletQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminSessionWalletKeys.all() }),
    queryClient.invalidateQueries({ queryKey: walletKeys.all() }),
  ])
}
