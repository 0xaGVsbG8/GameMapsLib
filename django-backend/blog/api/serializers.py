from rest_framework import serializers


class GameInfoSerializer(serializers.Serializer):
    GameName = serializers.CharField(required=True)