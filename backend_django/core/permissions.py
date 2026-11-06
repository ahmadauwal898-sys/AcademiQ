from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'super_admin')

class IsSchoolAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['super_admin', 'school_admin']
        )

class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['super_admin', 'school_admin', 'teacher']
        )

class EnforceTenantIsolation(permissions.BasePermission):
    """
    Ensures that non-superadmin users can only view and modify objects belonging to their authenticated school.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'super_admin':
            return True
        if hasattr(obj, 'school'):
            return obj.school == request.user.school
        if hasattr(obj, 'school_id'):
            return obj.school_id == request.user.school_id
        return False
