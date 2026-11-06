import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _

class SchoolStatus(models.TextChoices):
    PENDING = 'pending', _('Pending Approval')
    APPROVED = 'approved', _('Approved')
    REJECTED = 'rejected', _('Rejected')
    SUSPENDED = 'suspended', _('Suspended')

class SchoolLevel(models.TextChoices):
    NURSERY = 'Nursery', _('Nursery')
    PRIMARY = 'Primary', _('Primary')
    JUNIOR_SECONDARY = 'Junior Secondary', _('Junior Secondary')
    SENIOR_SECONDARY = 'Senior Secondary', _('Senior Secondary')
    COMBINED = 'Combined K-12', _('Combined K-12')

class UserRole(models.TextChoices):
    SUPER_ADMIN = 'super_admin', _('Platform Super Administrator')
    SCHOOL_ADMIN = 'school_admin', _('School Administrator')
    TEACHER = 'teacher', _('Teacher')
    BURSAR = 'bursar', _('Bursar / Accountant')
    STUDENT_PARENT = 'student_parent', _('Student / Parent')

class SubscriptionInterval(models.TextChoices):
    MONTHLY = 'monthly', _('Monthly')
    TERMLY = 'termly', _('Termly')
    ANNUAL = 'annual', _('Annual')

# 1. School (Tenant)
class School(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    email = models.EmailField()
    phone = models.CharField(max_length=32, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    country = models.CharField(max_length=64, default='Nigeria')
    state = models.CharField(max_length=64, blank=True, null=True)
    school_level = models.CharField(max_length=32, choices=SchoolLevel.choices)
    logo = models.ImageField(upload_to='school_logos/', blank=True, null=True)
    logo_url = models.URLField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=20, choices=SchoolStatus.choices, default=SchoolStatus.PENDING)
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

# 2. Custom User with Tenant Association
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.SUPER_ADMIN)
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None
    email = models.EmailField(_('email address'), unique=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE, null=True, blank=True, related_name='users')
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=32, blank=True, null=True)
    role = models.CharField(max_length=32, choices=UserRole.choices, default=UserRole.SCHOOL_ADMIN)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']
    objects = CustomUserManager()

    def __str__(self):
        return f"{self.full_name} ({self.role})"

# 3. Subscription Plans
class SubscriptionPlan(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    billing_interval = models.CharField(max_length=20, choices=SubscriptionInterval.choices, default=SubscriptionInterval.ANNUAL)
    max_students = models.PositiveIntegerField(default=500)
    max_staff = models.PositiveIntegerField(default=50)
    features_json = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class SchoolSubscription(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, default='active')
    start_date = models.DateField()
    expiry_date = models.DateField()
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=50, default='manual')
    created_at = models.DateTimeField(auto_now_add=True)

# 4. Academic Calendars
class AcademicSession(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='sessions')
    name = models.CharField(max_length=64)  # '2026/2027'
    is_current = models.BooleanField(default=False)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('school', 'name')

class AcademicTerm(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='terms')
    session = models.ForeignKey(AcademicSession, on_delete=models.CASCADE, related_name='terms')
    name = models.CharField(max_length=64)  # 'First Term'
    is_current = models.BooleanField(default=False)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    next_term_resumption = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

# 5. Classes & Arms
class SchoolClass(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='classes')
    name = models.CharField(max_length=64)  # 'SS 1'
    level = models.CharField(max_length=32, choices=SchoolLevel.choices)
    created_at = models.DateTimeField(auto_now_add=True)

class ClassArm(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='arms')
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name='arms')
    name = models.CharField(max_length=64)  # 'Science', 'Gold'
    created_at = models.DateTimeField(auto_now_add=True)

# 6. Subjects & Teacher Assignments
class Subject(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=128)
    code = models.CharField(max_length=32, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class TeacherAssignment(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignments')
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    arm = models.ForeignKey(ClassArm, on_delete=models.SET_NULL, null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    session = models.ForeignKey(AcademicSession, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

# 7. Students
class Student(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='students')
    admission_number = models.CharField(max_length=64)
    full_name = models.CharField(max_length=255)
    gender = models.CharField(max_length=10, choices=[('Male', 'Male'), ('Female', 'Female')])
    date_of_birth = models.DateField(null=True, blank=True)
    school_class = models.ForeignKey(SchoolClass, on_delete=models.PROTECT)
    arm = models.ForeignKey(ClassArm, on_delete=models.SET_NULL, null=True, blank=True)
    parent_name = models.CharField(max_length=255, blank=True, null=True)
    parent_phone = models.CharField(max_length=32, blank=True, null=True)
    parent_email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    photo_url = models.URLField(max_length=500, blank=True, null=True)
    enrollment_status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('school', 'admission_number')

# 8. Grading & Scores
class StudentScore(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='scores')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    term = models.ForeignKey(AcademicTerm, on_delete=models.CASCADE)
    session = models.ForeignKey(AcademicSession, on_delete=models.CASCADE)
    ca1 = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    ca2 = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    ca3 = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    exam = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    grade = models.CharField(max_length=5, default='F')
    remark = models.CharField(max_length=64, default='Fail')
    teacher_comment = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, default='draft')  # draft, submitted, approved, locked
    entered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('school', 'student', 'subject', 'term', 'session')

# 9. Published Term Result & Verification
class TermResult(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='term_results')
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    arm = models.ForeignKey(ClassArm, on_delete=models.SET_NULL, null=True, blank=True)
    term = models.ForeignKey(AcademicTerm, on_delete=models.CASCADE)
    session = models.ForeignKey(AcademicSession, on_delete=models.CASCADE)
    total_score = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    average_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    position = models.PositiveIntegerField(null=True, blank=True)
    class_size = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, default='draft')  # draft, approved, published, locked
    teacher_comment = models.TextField(blank=True)
    principal_comment = models.TextField(blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approved_results')
    approved_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    snapshot_json = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('school', 'student', 'term', 'session')

class ResultVerificationCode(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    term = models.ForeignKey(AcademicTerm, on_delete=models.CASCADE)
    session = models.ForeignKey(AcademicSession, on_delete=models.CASCADE)
    code_hash = models.CharField(max_length=128)  # SHA-256
    code_display = models.CharField(max_length=32)
    usage_count = models.PositiveIntegerField(default=0)
    max_usage = models.PositiveIntegerField(default=10)
    is_revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
