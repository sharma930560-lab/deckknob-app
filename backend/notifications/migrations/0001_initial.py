import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('events', '0001_initial'),
        ('posts', '0005_reellike_reelcomment_hashtag'),
        ('users', '0003_notification'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                (
                    'verb',
                    models.CharField(
                        choices=[
                            ('like', 'Like'),
                            ('comment', 'Comment'),
                            ('follow', 'Follow'),
                            ('share', 'Share'),
                            ('event_update', 'Event Update'),
                            ('live', 'Live'),
                        ],
                        max_length=20,
                    ),
                ),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'actor',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='sent_ws_notifications',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'recipient',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='ws_notifications',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'target_event',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to='events.event',
                    ),
                ),
                (
                    'target_post',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to='posts.post',
                    ),
                ),
                (
                    'target_reel',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to='posts.reel',
                    ),
                ),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
