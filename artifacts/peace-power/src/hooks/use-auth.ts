import { useCallback } from "react";
import { useGetMe, useLogin, useLogout, useRegister } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

// 5 minute garbage collection time — keeps user data in cache during navigation
const GC_TIME = 5 * 60 * 1000;

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useGetMe({
    query: {
      retry: false,
      staleTime: 0,
      gcTime: GC_TIME,
    },
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const registerMutation = useRegister();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ data: { email, password } });
      // Immediately populate cache with the returned user data.
      // This avoids a refetch race between page unmount and AuthGuard mount.
      queryClient.setQueryData(getGetMeQueryKey(), result);
      return result;
    },
    [loginMutation, queryClient]
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
  }, [logoutMutation, queryClient]);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await registerMutation.mutateAsync({ data: { name, email, password } });
      // Immediately populate cache with the returned user data.
      queryClient.setQueryData(getGetMeQueryKey(), result);
      return result;
    },
    [registerMutation, queryClient]
  );

  const isAuthenticated = !!user && !error;
  const isAdmin = user?.isAdmin ?? false;

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    register,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
