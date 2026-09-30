class AppConfig {
  static const String appName = 'WhiterChat';
  static const String appVersion = '1.0.0';
  static const String buildNumber = '1';

  // Production API Base URL (or local override for development)
  static const String defaultBaseUrl = 'https://whiterchat.me/api';
  
  // Dynamic base URL for local testing or custom host
  static String baseUrl = defaultBaseUrl;

  static void setBaseUrl(String url) {
    baseUrl = url;
  }
}
