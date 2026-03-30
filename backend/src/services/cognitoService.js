/**
 * AWS Cognito Authentication Service
 *
 * Drop-in replacement for JWT-based auth. When COGNITO_USER_POOL_ID is set,
 * authenticateToken middleware can verify Cognito tokens instead of local JWTs.
 *
 * Required env vars:
 *   COGNITO_USER_POOL_ID - e.g. eu-west-1_XXXXXXXXX
 *   COGNITO_CLIENT_ID - App client ID
 *   COGNITO_REGION - AWS region (default: eu-west-1)
 *
 * The local JWT auth remains the default when Cognito is not configured.
 * Both can coexist: Cognito for external users, local JWT for internal/demo.
 */

const { CognitoIdentityProviderClient, AdminGetUserCommand, InitiateAuthCommand, SignUpCommand, ConfirmSignUpCommand, ForgotPasswordCommand, ConfirmForgotPasswordCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');

class CognitoService {
  constructor() {
    this.userPoolId = process.env.COGNITO_USER_POOL_ID;
    this.clientId = process.env.COGNITO_CLIENT_ID;
    this.region = process.env.COGNITO_REGION || 'eu-west-1';
    this.client = null;

    if (this.userPoolId && this.clientId) {
      this.client = new CognitoIdentityProviderClient({ region: this.region });
      console.log('🔐 CognitoService initialized (live)');
      console.log(`   Pool: ${this.userPoolId}, Region: ${this.region}`);
    } else {
      console.log('🔐 CognitoService: not configured (using local JWT auth)');
    }
  }

  isConfigured() {
    return !!this.client;
  }

  /**
   * Sign in with email/password, returns Cognito tokens
   */
  async signIn(email, password) {
    if (!this.client) throw new Error('Cognito not configured');

    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: this.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    });

    const response = await this.client.send(command);
    return {
      accessToken: response.AuthenticationResult.AccessToken,
      idToken: response.AuthenticationResult.IdToken,
      refreshToken: response.AuthenticationResult.RefreshToken,
      expiresIn: response.AuthenticationResult.ExpiresIn
    };
  }

  /**
   * Register a new user in Cognito
   */
  async signUp(email, password, attributes = {}) {
    if (!this.client) throw new Error('Cognito not configured');

    const userAttributes = [
      { Name: 'email', Value: email }
    ];
    if (attributes.firstName) userAttributes.push({ Name: 'given_name', Value: attributes.firstName });
    if (attributes.lastName) userAttributes.push({ Name: 'family_name', Value: attributes.lastName });
    if (attributes.phone) userAttributes.push({ Name: 'phone_number', Value: attributes.phone });

    const command = new SignUpCommand({
      ClientId: this.clientId,
      Username: email,
      Password: password,
      UserAttributes: userAttributes
    });

    return this.client.send(command);
  }

  /**
   * Confirm signup with verification code
   */
  async confirmSignUp(email, code) {
    if (!this.client) throw new Error('Cognito not configured');

    const command = new ConfirmSignUpCommand({
      ClientId: this.clientId,
      Username: email,
      ConfirmationCode: code
    });

    return this.client.send(command);
  }

  /**
   * Initiate forgot password flow
   */
  async forgotPassword(email) {
    if (!this.client) throw new Error('Cognito not configured');

    const command = new ForgotPasswordCommand({
      ClientId: this.clientId,
      Username: email
    });

    return this.client.send(command);
  }

  /**
   * Confirm password reset with code
   */
  async confirmForgotPassword(email, code, newPassword) {
    if (!this.client) throw new Error('Cognito not configured');

    const command = new ConfirmForgotPasswordCommand({
      ClientId: this.clientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword
    });

    return this.client.send(command);
  }

  /**
   * Admin: create user directly (for internal user provisioning)
   */
  async adminCreateUser(email, temporaryPassword, attributes = {}) {
    if (!this.client) throw new Error('Cognito not configured');

    const userAttributes = [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' }
    ];
    if (attributes.firstName) userAttributes.push({ Name: 'given_name', Value: attributes.firstName });
    if (attributes.lastName) userAttributes.push({ Name: 'family_name', Value: attributes.lastName });

    const createCommand = new AdminCreateUserCommand({
      UserPoolId: this.userPoolId,
      Username: email,
      TemporaryPassword: temporaryPassword,
      UserAttributes: userAttributes,
      MessageAction: 'SUPPRESS' // Don't send welcome email
    });

    const result = await this.client.send(createCommand);

    // Set permanent password
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: this.userPoolId,
      Username: email,
      Password: temporaryPassword,
      Permanent: true
    });

    await this.client.send(setPasswordCommand);

    return result;
  }

  /**
   * Get user info from Cognito
   */
  async getUser(email) {
    if (!this.client) throw new Error('Cognito not configured');

    const command = new AdminGetUserCommand({
      UserPoolId: this.userPoolId,
      Username: email
    });

    return this.client.send(command);
  }

  /**
   * Verify a Cognito access token (for middleware use).
   * In production, use cognito-express or aws-jwt-verify for proper JWT validation.
   * This is a simplified version that calls Cognito to validate.
   */
  async verifyToken(accessToken) {
    if (!this.client) return null;

    try {
      // Use the GetUser API which validates the token server-side
      const { CognitoIdentityProviderClient, GetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
      const client = new CognitoIdentityProviderClient({ region: this.region });

      const command = new GetUserCommand({ AccessToken: accessToken });
      const response = await client.send(command);

      const attrs = {};
      (response.UserAttributes || []).forEach(attr => {
        attrs[attr.Name] = attr.Value;
      });

      return {
        username: response.Username,
        email: attrs.email,
        firstName: attrs.given_name,
        lastName: attrs.family_name,
        phone: attrs.phone_number,
        emailVerified: attrs.email_verified === 'true'
      };
    } catch (error) {
      return null;
    }
  }
}

// Singleton
let instance = null;
const getCognitoService = () => {
  if (!instance) instance = new CognitoService();
  return instance;
};

module.exports = { CognitoService, getCognitoService };
