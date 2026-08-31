import django.db.models.deletion
import django.db.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Updates the Bookmark model to support both post and reel bookmarks:
    - Makes post FK nullable
    - Adds a stub Reel model (to be extended in Phase 4 / Task 16)
    - Adds reel FK (nullable) to Bookmark
    - Replaces unique_together with two conditional UniqueConstraints
    """

    dependencies = [
        ('posts', '0003_story_bookmark'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Create stub Reel model (will be extended in Phase 4)
        migrations.CreateModel(
            name='Reel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('media_url', models.URLField(max_length=1000)),
                ('caption', models.TextField(blank=True, null=True)),
                ('duration_seconds', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reels',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        # Make post FK nullable
        migrations.AlterField(
            model_name='bookmark',
            name='post',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='bookmarks',
                to='posts.post',
            ),
        ),
        # Remove old unique_together constraint
        migrations.AlterUniqueTogether(
            name='bookmark',
            unique_together=set(),
        ),
        # Add reel FK (nullable)
        migrations.AddField(
            model_name='bookmark',
            name='reel',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='bookmarks',
                to='posts.reel',
            ),
        ),
        # Add UniqueConstraint for (user, post) when post is not null
        migrations.AddConstraint(
            model_name='bookmark',
            constraint=models.UniqueConstraint(
                condition=django.db.models.Q(post__isnull=False),
                fields=['user', 'post'],
                name='unique_user_post_bookmark',
            ),
        ),
        # Add UniqueConstraint for (user, reel) when reel is not null
        migrations.AddConstraint(
            model_name='bookmark',
            constraint=models.UniqueConstraint(
                condition=django.db.models.Q(reel__isnull=False),
                fields=['user', 'reel'],
                name='unique_user_reel_bookmark',
            ),
        ),
    ]
