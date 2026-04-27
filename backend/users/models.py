from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    bio = models.TextField(blank=True, null=True)
    profile_pic = models.URLField(max_length=500, blank=True, null=True)
    
    def __str__(self):
        return self.username
