from django.urls import path

from . import views

urlpatterns = [
    path("bootstrap/", views.BootstrapView.as_view()),
    path("csrf/", views.CsrfView.as_view()),
    path("meta/", views.MetaView.as_view()),
    path("auth/signup/", views.SignupView.as_view()),
    path("auth/login/", views.LoginView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),
    path("auth/me/", views.MeView.as_view()),
    path("auth/password/", views.PasswordChangeView.as_view()),
    path("auth/password-reset/", views.PasswordResetRequestView.as_view()),
    path("auth/password-reset/confirm/", views.PasswordResetConfirmView.as_view()),
]
