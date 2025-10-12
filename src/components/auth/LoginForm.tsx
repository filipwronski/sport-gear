import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuth, type LoginFormData } from "./useAuth";
import GoogleAuthButton from "./GoogleAuthButton";

export interface LoginFormProps {
  onSuccess: () => void;
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onForgotPassword,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const { authState, login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      onSuccess();
    } catch {
      // Error is handled by useAuth hook
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
      aria-labelledby="login-form-title"
    >
      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email">Adres email</Label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-3 h-4 w-4 text-gray-400"
            aria-hidden="true"
          />
          <Input
            id="email"
            type="email"
            placeholder="wprowadź swój email"
            className="pl-10"
            autoComplete="email"
            aria-describedby={errors.email ? "email-error" : undefined}
            aria-invalid={!!errors.email}
            {...register("email", {
              required: "Email jest wymagany",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Wprowadź prawidłowy adres email",
              },
            })}
          />
        </div>
        {errors.email && (
          <p
            id="email-error"
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password">Hasło</Label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-3 h-4 w-4 text-gray-400"
            aria-hidden="true"
          />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="wprowadź swoje hasło"
            className="pl-10 pr-10"
            autoComplete="current-password"
            aria-describedby={errors.password ? "password-error" : undefined}
            aria-invalid={!!errors.password}
            {...register("password", {
              required: "Hasło jest wymagane",
              minLength: {
                value: 8,
                message: "Hasło musi mieć co najmniej 8 znaków",
              },
            })}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p
            id="password-error"
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center space-x-2">
        <input
          id="rememberMe"
          type="checkbox"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          {...register("rememberMe")}
        />
        <Label htmlFor="rememberMe" className="text-sm cursor-pointer">
          Zapamiętaj mnie
        </Label>
      </div>

      {/* Login Button */}
      <Button type="submit" className="w-full" disabled={authState.isLoading}>
        {authState.isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Logowanie...</span>
          </div>
        ) : (
          "Zaloguj się"
        )}
      </Button>

      {/* Forgot Password Link */}
      <div className="text-center">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-blue-600 hover:underline"
        >
          Zapomniałeś hasła?
        </button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Lub</span>
        </div>
      </div>

      {/* Google Auth Button */}
      <GoogleAuthButton onSuccess={onSuccess} />
    </form>
  );
};

export default LoginForm;
