import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterForm from "./RegisterForm";
import { useAuth } from "./useAuth";

// Mock the useAuth hook
const mockRegister = vi.fn();
const mockOnSuccess = vi.fn();

vi.mock("./useAuth", () => ({
  useAuth: () => ({
    authState: {
      isLoading: false,
      error: null,
      successMessage: null,
    },
    register: mockRegister,
  }),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  EyeOff: () => <div data-testid="eye-off-icon">EyeOff</div>,
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  Lock: () => <div data-testid="lock-icon">Lock</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
  XCircle: () => <div data-testid="x-icon">X</div>,
}));

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all form elements", () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    expect(screen.getByLabelText(/adres email/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Hasło")).toBeInTheDocument();
    expect(screen.getByLabelText(/potwierdź hasło/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /zarejestruj się/i }),
    ).toBeInTheDocument();
  });

  it("should validate required fields", async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const form = screen.getByRole("form");

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/email jest wymagany/i)).toBeInTheDocument();
      expect(screen.getByText(/hasło jest wymagane/i)).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("should validate email format", async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/adres email/i);
    const submitButton = screen.getByRole("button", {
      name: /zarejestruj się/i,
    });

    await userEvent.type(emailInput, "invalid-email");
    fireEvent.submit(screen.getByRole("form"));

    await waitFor(() => {
      expect(
        screen.getByText(/wprowadź prawidłowy adres email/i),
      ).toBeInTheDocument();
    });
  });

  it("should show password strength indicator", async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByLabelText("Hasło");

    // Type weak password
    await userEvent.type(passwordInput, "123");
    expect(screen.getByText("Bardzo słabe")).toBeInTheDocument();

    // Clear and type medium password
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, "password1");
    expect(screen.getByText("Średnie")).toBeInTheDocument();

    // Clear and type strong password
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, "Password123!");
    expect(screen.getByText("Silne")).toBeInTheDocument();
  });

  it("should validate password confirmation", async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByLabelText("Hasło");
    const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);
    const submitButton = screen.getByRole("button", {
      name: /zarejestruj się/i,
    });

    await userEvent.type(passwordInput, "Password123!");
    await userEvent.type(confirmPasswordInput, "DifferentPassword123!");
    fireEvent.submit(screen.getByRole("form"));

    await waitFor(() => {
      expect(
        screen.getByText(/hasła muszą być identyczne/i),
      ).toBeInTheDocument();
    });
  });

  it("should show password confirmation match status", async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByLabelText("Hasło");
    const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);

    // Type matching passwords
    await userEvent.type(passwordInput, "Password123!");
    await userEvent.type(confirmPasswordInput, "Password123!");

    expect(screen.getByText("Hasła są identyczne")).toBeInTheDocument();

    // Change confirmation to not match
    await userEvent.clear(confirmPasswordInput);
    await userEvent.type(confirmPasswordInput, "Different");

    expect(screen.getByText("Hasła muszą być identyczne")).toBeInTheDocument();
  });

  it("should disable submit button when password requirements not met", () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByLabelText("Hasło");
    const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);
    const submitButton = screen.getByRole("button", {
      name: /zarejestruj się/i,
    });

    // Type weak password
    fireEvent.change(passwordInput, { target: { value: "weak" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "weak" } });

    expect(submitButton).toBeDisabled();
  });

  it("should submit form with valid data", async () => {
    mockRegister.mockResolvedValue(undefined);

    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/adres email/i);
    const passwordInput = screen.getByLabelText("Hasło");
    const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);
    const submitButton = screen.getByRole("button", {
      name: /zarejestruj się/i,
    });

    await userEvent.type(emailInput, "test@example.com");
    await userEvent.type(passwordInput, "Password123!");
    await userEvent.type(confirmPasswordInput, "Password123!");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      });
    });
  });

  it("should toggle password visibility", async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByLabelText("Hasło");
    const toggleButton = screen.getByLabelText(/pokaż hasło/i);

    // Initially password should be hidden
    expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle to show password
    await userEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/ukryj hasło/i)).toBeInTheDocument();
  });

  it("should toggle confirm password visibility", async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);
    const toggleButton = screen.getByLabelText(/pokaż potwierdzenie hasła/i);

    // Initially password should be hidden
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    // Click toggle to show password
    await userEvent.click(toggleButton);
    expect(confirmPasswordInput).toHaveAttribute("type", "text");
    expect(
      screen.getByLabelText(/ukryj potwierdzenie hasła/i),
    ).toBeInTheDocument();
  });

  it("should handle form submission with valid data", async () => {
    // Test that form submission works correctly
    mockRegister.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/adres email/i);
    const passwordInput = screen.getByLabelText("Hasło");
    const confirmPasswordInput = screen.getByLabelText(/potwierdź hasło/i);
    const submitButton = screen.getByRole("button", { name: /zarejestruj się/i });

    await userEvent.type(emailInput, "test@example.com");
    await userEvent.type(passwordInput, "Password123!");
    await userEvent.type(confirmPasswordInput, "Password123!");

    // Initially button should not be disabled
    expect(submitButton).not.toBeDisabled();

    await userEvent.click(submitButton);

    // Verify the register function was called with correct data
    expect(mockRegister).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
  });

  it("should have proper accessibility attributes", () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const form = screen.getByRole("form");
    expect(form).toHaveAttribute("noValidate", "");

    const emailInput = screen.getByLabelText(/adres email/i);
    expect(emailInput.getAttribute("autoComplete")).toBe("email");

    const passwordInput = screen.getByLabelText("Hasło");
    expect(passwordInput.getAttribute("aria-invalid")).toBeNull();

    const toggleButton = screen.getByLabelText(/pokaż hasło/i);
    expect(toggleButton.getAttribute("aria-label")).toBe("Pokaż hasło");
  });

  it("should show password requirement indicators", () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByLabelText("Hasło");

    // Type password that meets some requirements
    fireEvent.change(passwordInput, { target: { value: "Password1" } });

    expect(screen.getByText("Co najmniej 8 znaków")).toBeInTheDocument();
    expect(screen.getByText("Wielka litera")).toBeInTheDocument();
    expect(screen.getByText("Mała litera")).toBeInTheDocument();
    expect(screen.getByText("Cyfra")).toBeInTheDocument();
  });
});
