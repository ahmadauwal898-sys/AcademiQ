from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import School, Student, SchoolClass, Subject, AcademicSession, AcademicTerm, TermResult

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for Vercel deployment and monitoring.
    """
    return Response({
        'status': 'healthy',
        'platform': 'AcademiQ Django Backend Engine',
        'version': '1.2.0',
        'company': 'BG GROUP OF SOFTWARES',
        'ceo': 'Ahmad Auwal',
        'timestamp': timezone.now().isoformat(),
        'database': 'connected'
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def platform_info(request):
    """
    Returns platform metadata, versioning, and founder information.
    """
    return Response({
        'platform_name': 'AcademiQ',
        'version': 'v1.2.0',
        'company': 'BG GROUP OF SOFTWARES',
        'founder_ceo': 'Ahmad Auwal',
        'support_phone': '+2349155377861',
        'support_email': 'ahmadauwal898@gmail.com',
        'mission': 'Empowering schools of all sizes with affordable, reliable, and transparent digital management.',
        'vision': 'Becoming the digital operating system for over 100,000 institutions globally.'
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def public_schools_list(request):
    """
    Lists approved registered schools for public verification.
    """
    schools = School.objects.filter(status='approved').values('id', 'name', 'slug', 'country', 'state', 'school_level', 'logo_url')
    return Response({'count': len(schools), 'schools': list(schools)})
