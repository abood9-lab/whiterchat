import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_client.dart';
import '../core/network/api_endpoints.dart';
import '../core/storage/secure_storage_service.dart';
import '../models/user_model.dart';

enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  needsVerification,
  twoFactorRequired,
}

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final String? token;
  final String? pendingEmail;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.token,
    this.pendingEmail,
    this.errorMessage,
  });

  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    String? token,
    String? pendingEmail,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      token: token ?? this.token,
      pendingEmail: pendingEmail ?? this.pendingEmail,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient;
  final SecureStorageService _storage;

  AuthNotifier(this._apiClient, this._storage) : super(const AuthState()) {
    checkSession();
  }

  // Restore session from SecureStorage
  Future<void> checkSession() async {
    try {
      state = state.copyWith(status: AuthStatus.loading);
      final token = await _storage.getToken();
      final userJson = await _storage.getUserJson();

      if (token != null && userJson != null) {
        final parsedUser = UserModel.fromJson(jsonDecode(userJson));
        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: parsedUser,
          token: token,
        );

        // Background verification with /auth/me
        try {
          final res = await _apiClient.get(ApiEndpoints.me);
          if (res.data != null && res.data['user'] != null) {
            final freshUser = UserModel.fromJson(res.data['user']);
            state = state.copyWith(user: freshUser);
            await _storage.saveUserJson(jsonEncode(freshUser.toJson()));
          }
        } catch (_) {
          // Keep cached user if offline
        }
      } else {
        state = state.copyWith(status: AuthStatus.unauthenticated);
      }
    } catch (_) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  // Login
  Future<bool> login({
    required String login,
    required String password,
    String? code,
  }) async {
    try {
      state = state.copyWith(status: AuthStatus.loading, errorMessage: null);

      final res = await _apiClient.post(
        ApiEndpoints.login,
        data: {
          'login': login.trim(),
          'password': password.trim(),
          if (code != null && code.isNotEmpty) 'code': code.trim(),
        },
      );

      final data = res.data;
      if (data != null && data['token'] != null && data['user'] != null) {
        final user = UserModel.fromJson(data['user']);
        final token = data['token'].toString();

        await _storage.saveToken(token);
        await _storage.saveUserJson(jsonEncode(user.toJson()));

        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: user,
          token: token,
        );
        return true;
      }

      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: 'Invalid response from server',
      );
      return false;
    } on DioException catch (e) {
      final errorMsg = e.response?.data?['message'] ??
          e.response?.data?['error'] ??
          e.message ??
          'Login failed';

      if (errorMsg.toString().toLowerCase().contains('2fa') ||
          errorMsg.toString().toLowerCase().contains('two-factor')) {
        state = state.copyWith(
          status: AuthStatus.twoFactorRequired,
          errorMessage: 'Two-factor authentication code required',
        );
        return false;
      }

      if (errorMsg.toString().toLowerCase().contains('verify your email')) {
        state = state.copyWith(
          status: AuthStatus.needsVerification,
          pendingEmail: login,
          errorMessage: errorMsg.toString(),
        );
        return false;
      }

      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: errorMsg.toString(),
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  // Signup
  Future<bool> signup({
    required String username,
    required String displayName,
    required String email,
    required String password,
  }) async {
    try {
      state = state.copyWith(status: AuthStatus.loading, errorMessage: null);

      final res = await _apiClient.post(
        ApiEndpoints.register,
        data: {
          'username': username.trim().toLowerCase(),
          'displayName': displayName.trim(),
          'email': email.trim().toLowerCase(),
          'password': password,
        },
      );

      final data = res.data;
      if (data != null && data['requiresVerification'] == true) {
        state = state.copyWith(
          status: AuthStatus.needsVerification,
          pendingEmail: email.trim().toLowerCase(),
        );
        return true;
      }

      if (data != null && data['token'] != null && data['user'] != null) {
        final user = UserModel.fromJson(data['user']);
        final token = data['token'].toString();

        await _storage.saveToken(token);
        await _storage.saveUserJson(jsonEncode(user.toJson()));

        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: user,
          token: token,
        );
        return true;
      }

      return true;
    } on DioException catch (e) {
      final errorMsg = e.response?.data?['message'] ??
          e.response?.data?['error'] ??
          'Registration failed';
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        errorMessage: errorMsg.toString(),
      );
      return false;
    }
  }

  // Verify OTP
  Future<bool> verifyOtp({
    required String email,
    required String code,
  }) async {
    try {
      state = state.copyWith(status: AuthStatus.loading, errorMessage: null);

      final res = await _apiClient.post(
        ApiEndpoints.verifyOtp,
        data: {
          'email': email.trim().toLowerCase(),
          'code': code.trim(),
        },
      );

      final data = res.data;
      if (data != null && data['token'] != null && data['user'] != null) {
        final user = UserModel.fromJson(data['user']);
        final token = data['token'].toString();

        await _storage.saveToken(token);
        await _storage.saveUserJson(jsonEncode(user.toJson()));

        state = state.copyWith(
          status: AuthStatus.authenticated,
          user: user,
          token: token,
        );
        return true;
      }

      return false;
    } on DioException catch (e) {
      final errorMsg = e.response?.data?['message'] ??
          e.response?.data?['error'] ??
          'Invalid verification code';
      state = state.copyWith(
        status: AuthStatus.needsVerification,
        errorMessage: errorMsg.toString(),
      );
      return false;
    }
  }

  // Logout
  Future<void> logout() async {
    await _storage.clearAll();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

// Global Providers
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
final secureStorageProvider = Provider<SecureStorageService>((ref) => SecureStorageService());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthNotifier(apiClient, storage);
});
