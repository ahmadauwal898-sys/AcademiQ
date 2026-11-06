from django.urls import path
from . import views

urlpatterns = [
    path('health', views.health_check, name='health-check'),
    path('info', views.platform_info, name='platform-info'),
    path('schools', views.public_schools_list, name='public-schools'),
]
