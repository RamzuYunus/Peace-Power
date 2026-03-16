import { useCallback } from "react";
import { useGetMe, useLogin, useLogout, useRegister } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

export function useAuth() {
  const queryClient = useQueryClient();

  const getMeQuery = useGetMe({
    query: { retry: false, staleTime: 0, gcTime: 0 },
  });

  const { data: user, isLoading, error, refetch } = getMeQuery;

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const registerMutation = useRegister();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ data: { email, password } });
      // Wait for the refetch to complete
      await refetch();
      return result;
    },
    [loginMutation, refetch]
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
  }, [logoutMutation, queryClient]);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await registerMutation.mutateAsync({ data: { name, email, password } });
      // Wait for the refetch to complete
      await refetch();
      return result;
    },
    [registerMutation, refetch]
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
