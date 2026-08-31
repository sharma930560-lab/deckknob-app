from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_notification'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='is_live',
            field=models.BooleanField(default=False),
        ),
    ]
